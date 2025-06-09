'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaUserCheck, FaClock, FaCalendarAlt, FaInfoCircle, FaStopCircle, FaTimes } from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Image from 'next/image';
import { useTheme } from "@/context/ThemeContext";

// Update office location with more precise radius
const OFFICE_LOCATION = {
  latitude: 12.9707,
  longitude: 77.6068,
  radius: 500 // increased radius to 500 meters for better coverage
};

// Improve distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in meters
};

// Camera Modal Component
const CameraModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean; onClose: () => void; onCapture: (photo: string) => void }) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const capturePhoto = useCallback(async () => {
    let mediaStream: MediaStream | null = null;
    try {
      setIsCapturing(true);
      
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Create temporary video element
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.play();

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onplaying = () => resolve();
      });

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to get canvas context');

      // Handle mirroring for selfie mode
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      // Cleanup
      mediaStream.getTracks().forEach(track => track.stop());
      video.remove();

      onCapture(imageData);
      onClose();

    } catch (error) {
      console.error('Photo capture error:', error);
      setCameraError('Failed to capture photo. Please try again.');
    } finally {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      setIsCapturing(false);
    }
  }, [facingMode, onCapture, onClose]);

  const handleCameraSwitch = useCallback(() => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  }, []);

  const renderError = useCallback(() => (
    <div className="p-6 text-center">
      <div className="mb-4 text-red-500">
        <FaExclamationCircle className="w-12 h-12 mx-auto" />
      </div>
      <p className="text-lg text-red-600 font-medium mb-4">{cameraError}</p>
      <div className="space-y-3">
        <button
          onClick={() => setCameraError(null)}
          className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={onClose}
          className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  ), [cameraError, onClose]);

  useEffect(() => {
    return () => {
      // Cleanup will be handled in capturePhoto
    };
  }, []);

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
          >
            <FaTimes className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {cameraError ? (
          renderError()
        ) : (
          <div className="space-y-6 p-4">
            <div className="text-center">
              <FaCamera className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600 mb-8">
                Click the button below to take a photo
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                disabled={isCapturing}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
              >
                {isCapturing ? (
                  <>
                    <FaSpinner className="animate-spin w-5 h-5" />
                    <span>Capturing...</span>
                  </>
                ) : (
                  <>
                    <FaCamera className="w-5 h-5" />
                    <span>Capture Photo</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCameraSwitch}
                disabled={isCapturing}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-full shadow flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Switch Camera</span>
              </button>
            </div>
          </div>
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
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const { theme } = useTheme();
  const [locationError, setLocationError] = useState<string | null>(null);

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
    // Validate that the photo is in correct format
    if (!photoData.startsWith('data:image/')) {
      setMarkAttendanceError('Invalid photo format');
      return;
    }
    
    // Store the full data URL
    setPhotoPreview(photoData);
    setMarkAttendanceError(null);
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

  const validateLocation = async () => {
    try {
      const location = await getCurrentLocation();
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      console.log('Current location:', location);
      console.log('Distance from office:', distance, 'meters');

      if (distance > OFFICE_LOCATION.radius) {
        setLocationError(`You are ${Math.round(distance)}m away from office. Please mark attendance from within ${OFFICE_LOCATION.radius}m of office location.`);
        return false;
      }
      
      setLocationError(null);
      return true;
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Please enable location services in your device settings and try again');
      return false;
    }
  };

  // Modify handleMarkAttendance for immediate submission
  const handleMarkAttendance = async () => {
    try {
      setMarkingAttendance(true);
      setMarkAttendanceError(null);
      setLocationError(null);

      if (!photoPreview) {
        throw new Error('Please capture a photo first');
      }

      // Validate location before proceeding
      const isLocationValid = await validateLocation();
      if (!isLocationValid) {
        throw new Error('Location validation failed');
      }

      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      const location = await getCurrentLocation().catch(() => {
        throw new Error('Please enable location services');
      });

      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/mark-with-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          photo: photoPreview, // Send the full data URL
          latitude: location.latitude,
          longitude: location.longitude,
          attendanceType: "office" // Added as per API requirements
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to mark attendance');
      
      // Show success message with employee details
      const successMessage = `Attendance marked successfully for ${data.attendance.projectName} - ${data.attendance.designation}`;
      setMarkAttendanceSuccess(successMessage);
      setPhotoPreview(null);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMarkAttendanceError(errorMessage);
    } finally {
      setMarkingAttendance(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className={`rounded-2xl shadow-xl p-8 mb-8 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-800 to-gray-700'
          : 'bg-gradient-to-r from-blue-600 to-blue-800'
      }`}>
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
        <div className={`rounded-xl shadow-lg p-8 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        } border`}>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            <FaCamera className="text-blue-500" />
            Photo Verification
          </h3>
          <div className={`rounded-xl p-8 border-2 border-dashed ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-600'
              : 'bg-white border-blue-200'
          } shadow-md`}>
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
                    <div className={`relative rounded-full p-8 inline-block shadow-xl ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <FaCamera className="h-16 w-16 text-white" />
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>Ready to Capture</h3>
                  <p className={`mb-8 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Please ensure you&apos;re in a well-lit area and facing the camera directly
                  </p>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700'
                    } text-white`}
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
        <div className={`rounded-xl shadow-lg p-8 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        } border`}>
          <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            <FaMapMarkerAlt className="text-blue-500" />
            Location Verification
          </h3>
          
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <p className={`mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                <FaInfoCircle className="inline mr-2 text-blue-500" />
                Your device&apos;s location will be verified against your registered office location
              </p>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Please ensure your device&apos;s location services are enabled
              </p>
            </div>

            <div className="space-y-4">
              {markAttendanceError && (
                <FeedbackMessage message={markAttendanceError} type="error" />
              )}
              {markAttendanceSuccess && (
                <FeedbackMessage message={markAttendanceSuccess} type="success" />
              )}
            </div>

            {/* Add location error message */}
            {locationError && (
              <FeedbackMessage message={locationError} type="error" />
            )}

            <button
              onClick={handleMarkAttendance}
              disabled={markingAttendance || !photoPreview}
              className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                markingAttendance || !photoPreview
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-xl transform hover:scale-105'
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
