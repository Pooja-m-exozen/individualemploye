'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaUserCheck, FaClock, FaCalendarAlt, FaInfoCircle, FaStopCircle, FaTimes } from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Image from 'next/image';

// Camera Modal Component
const CameraModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean; onClose: () => void; onCapture: (photo: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions and try again.');
    }
  }, [facingMode, stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, stream, startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const startCountdown = () => {
    setIsCapturing(true);
    // setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          capturePhoto();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally if using front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(photoData);
        setIsCapturing(false);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative bg-white rounded-3xl p-6 max-w-3xl w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaCamera className="text-blue-600" />
            Take Your Photo
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isCapturing}
          >
            <FaTimes className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {cameraError ? (
          <div className="p-6 text-center">
            <div className="mb-4 text-red-500">
              <FaExclamationCircle className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-lg text-red-600 font-medium">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              
              {/* Overlay for countdown and guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Face outline guide */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-white/30 rounded-full"></div>
                </div>
                
                {/* Countdown display */}
                {countdown && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-8xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6">
                <button
                  onClick={toggleCamera}
                  disabled={isCapturing}
                  className="bg-white/20 backdrop-blur-md text-white p-4 rounded-full hover:bg-white/30 transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button
                  onClick={startCountdown}
                  disabled={isCapturing}
                  className="bg-blue-600 text-white p-6 rounded-full hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
                >
                  {isCapturing ? (
                    <FaSpinner className="w-8 h-8 animate-spin" />
                  ) : (
                    <FaCamera className="w-8 h-8" />
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800 flex items-center gap-2">
                <FaInfoCircle className="text-blue-600" />
                Position your face within the circle and ensure good lighting for the best results
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Enhanced feedback messages with animation
const FeedbackMessage = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div 
    className={`flex items-center gap-3 p-4 rounded-xl animate-slideIn ${
      type === 'success' 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100' 
        : 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-100'
    }`}
  >
    <div className={`p-2 rounded-full ${
      type === 'success' ? 'bg-green-100' : 'bg-red-100'
    }`}>
      {type === 'success' ? (
        <FaCheckCircle className="w-5 h-5 text-green-600" />
      ) : (
        <FaExclamationCircle className="w-5 h-5 text-red-600" />
      )}
    </div>
    <p className={`text-sm font-medium ${
      type === 'success' ? 'text-green-800' : 'text-red-800'
    }`}>
      {message}
    </p>
  </div>
);

function MarkAttendanceContent() {
  const router = useRouter();
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [markAttendanceError, setMarkAttendanceError] = useState<string | null>(null);
  const [markAttendanceSuccess, setMarkAttendanceSuccess] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [router]);

  const updateDateTime = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }));
    setCurrentDate(now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
  };

  const handlePhotoCapture = (photoData: string) => {
    setPhotoPreview(photoData);
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error('Failed to get location: ' + error.message));
        }
      );
    });
  };

  const handleMarkAttendance = async () => {
    try {
      setMarkingAttendance(true);
      setMarkAttendanceError(null);
      setLocationError(null);

      if (!photoPreview) {
        setMarkAttendanceError('Please capture your photo first');
        return;
      }

      let location;
      try {
        location = await getCurrentLocation();
      } catch  {
        setLocationError('Failed to get location. Please enable location services.');
        return;
      }

      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${getEmployeeId()}/mark-with-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photo: photoPreview,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const data = await response.json();

      if (response.ok && data.attendance) {
        setMarkAttendanceSuccess(data.message || 'Attendance marked successfully!');
        setPhotoPreview(null);
      } else {
        throw new Error(data.message || 'Failed to mark attendance');
      }
    } catch (error: unknown) {
      setMarkAttendanceError(error instanceof Error ? error.message : 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-xl p-8 mb-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
              <FaUserCheck className="text-3xl text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Mark Attendance</h2>
              <p className="text-blue-100 mt-1">Welcome to the official attendance management system</p>
            </div>
          </div>
          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl">
            <div className="flex items-center gap-3">
              <FaClock className="text-2xl text-blue-200" />
              <div>
                <p className="text-2xl font-bold">{currentTime}</p>
                <p className="text-sm text-blue-200">Current Time</p>
              </div>
            </div>
            <div className="w-px h-12 bg-white/20"></div>
            <div className="flex items-center gap-3">
              <FaCalendarAlt className="text-2xl text-blue-200" />
              <div>
                <p className="font-medium">{currentDate}</p>
                <p className="text-sm text-blue-200">Today&apos;s Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Photo Section */}
        <div className="rounded-xl shadow-sm border border-gray-200/30 p-8 bg-card">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaCamera className="text-blue-600" />
            Photo Verification
          </h3>
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-8 border-2 border-dashed border-blue-200">
            <div className="flex flex-col items-center justify-center">
              {photoPreview ? (
                <div className="relative group">
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    width={800}
                    height={600}
                    className="w-full h-[400px] object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => setPhotoPreview(null)}
                      className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg transform hover:scale-110"
                      title="Retake photo"
                    >
                      <FaStopCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-20"></div>
                    <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-8 inline-block shadow-xl">
                      <FaCamera className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Ready to Capture</h3>
                  <p className="text-gray-600 mb-8">
                    Please ensure you&apos;re in a well-lit area and facing the camera directly
                  </p>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <FaCamera className="w-5 h-5" />
                    <span>Start Camera</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status and Action Section */}
        <div className="rounded-xl shadow-sm border border-gray-200/30 p-8 bg-card">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaMapMarkerAlt className="text-blue-600" />
            Location Verification
          </h3>
          
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-xl">
              <p className="text-gray-600 mb-2">
                <FaInfoCircle className="inline mr-2 text-blue-600" />
                Your device&apos;s location will be verified against your registered office location
              </p>
              <p className="text-sm text-gray-500">
                Please ensure your device&apos;s location services are enabled
              </p>
            </div>

            <div className="space-y-4">
              {locationError && (
                <FeedbackMessage message={locationError} type="error" />
              )}
              {markAttendanceError && (
                <FeedbackMessage message={markAttendanceError} type="error" />
              )}
              {markAttendanceSuccess && (
                <FeedbackMessage message={markAttendanceSuccess} type="success" />
              )}
            </div>

            <button
              onClick={handleMarkAttendance}
              disabled={markingAttendance || !photoPreview}
              className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                markingAttendance || !photoPreview
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {markingAttendance ? (
                <>
                  <FaSpinner className="animate-spin w-5 h-5" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaUserCheck className="w-5 h-5" />
                  <span>Mark Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handlePhotoCapture}
      />
    </div>
  );
}

export default function MarkAttendancePage() {
  return (
    <DashboardLayout>
      <MarkAttendanceContent />
    </DashboardLayout>
  );
}