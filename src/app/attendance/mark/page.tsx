'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaUserCheck, FaInfoCircle, FaStopCircle, FaTimes, FaArrowLeft, FaFingerprint, FaUserShield } from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Image from 'next/image';
import { useTheme } from "@/context/ThemeContext";
import { matchFace, detectFaces, verifyFaceQuality, markAttendanceWithFace, enrollFace } from '@/services/facialRecognition';
import { scanForDevices, markAttendanceWithFingerprint, BiometricDevice } from '@/services/biometricDevice';
import SecureyeConnectionHelper from '@/components/biometric/SecureyeConnectionHelper';

// Update office location with more precise radius
const OFFICE_LOCATION = {
  latitude: 12.9707,
  longitude: 77.6068,
  radius: 500, // 500 meters radius
  tolerance: 10 // 10 meters tolerance for exact location match
};

// Calculate distance between two coordinates using Haversine formula
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

// Simplified feedback messages
const FeedbackMessage = ({ message, type }: { message: string; type: 'success' | 'error' }) => (
  <div 
    className={`flex items-center gap-2 p-3 rounded-lg border ${
      type === 'success' 
        ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700' 
        : 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700'
    }`}
  >
    {type === 'success' ? (
      <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    ) : (
      <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
    )}
    <p className={`text-sm ${
      type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
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
  const { theme } = useTheme();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRemoteUser, setIsRemoteUser] = useState<boolean>(false);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [faceVerificationMessage, setFaceVerificationMessage] = useState<string | null>(null);
  const [faceConfidence, setFaceConfidence] = useState<number>(0);
  const [useFacialRecognition] = useState<boolean>(true);
  const [useBiometricDevice, setUseBiometricDevice] = useState<boolean>(false);
  const [availableBiometricDevices, setAvailableBiometricDevices] = useState<BiometricDevice[]>([]);
  const [selectedBiometricDevice, setSelectedBiometricDevice] = useState<string | null>(null);
  const [biometricVerificationStatus, setBiometricVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [biometricConfidence, setBiometricConfidence] = useState<number>(0);
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  const [faceNotEnrolled, setFaceNotEnrolled] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    // Fetch employee data to check if they're a remote user
    const fetchEmployeeData = async () => {
      try {
        const employeeId = getEmployeeId();
        if (!employeeId) return;
        
        const response = await fetch(`https://cafm.zenapi.co.in/api/kyc`);
        const data = await response.json();
        
        if (data.kycForms) {
          interface KYCForm {
            personalDetails?: {
              employeeId?: string;
              projectName?: string;
            };
          }
          
          const employee = data.kycForms.find(
            (form: KYCForm) => form.personalDetails?.employeeId === employeeId
          );
          
          if (employee) {
            const projectName = employee.personalDetails?.projectName || '';
            // Check if project name contains "Remote" or similar indicators
            const remoteIndicators = ['Remote', 'remote', 'Work from Home', 'WFH', 'Home'];
            const isRemote = remoteIndicators.some(indicator => 
              projectName.toLowerCase().includes(indicator.toLowerCase())
            );
            setIsRemoteUser(isRemote);
          }
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
      }
    };
    
    fetchEmployeeData();
    
    // Scan for biometric devices on mount
    const scanDevices = async () => {
      const devices = await scanForDevices();
      setAvailableBiometricDevices(devices);
      if (devices.length > 0 && devices[0].isConnected) {
        setSelectedBiometricDevice(devices[0].id);
        setUseBiometricDevice(true);
      }
    };
    
    scanDevices();
  }, [router]);

  // Scan devices function (can be called from UI)
  const handleScanDevices = async (useWebSerial: boolean = false) => {
    try {
      const devices = await scanForDevices(useWebSerial);
      setAvailableBiometricDevices(devices);
      if (devices.length > 0 && !selectedBiometricDevice) {
        setSelectedBiometricDevice(devices[0].id);
      }
    } catch (error) {
      console.error('Device scan error:', error);
      setMarkAttendanceError('Failed to scan for devices. Please try again.');
    }
  };


  const handlePhotoCapture = async (photoData: string) => {
    // Validate that the photo is in correct format
    if (!photoData.startsWith('data:image/')) {
      setMarkAttendanceError('Invalid photo format');
      return;
    }
    
    // Store the full data URL
    setPhotoPreview(photoData);
    setMarkAttendanceError(null);
    setFaceVerificationStatus('idle');
    setFaceVerificationMessage(null);
    setFaceConfidence(0);
    setFaceNotEnrolled(false);
    
    // If facial recognition is enabled, verify the face
    if (useFacialRecognition) {
      await verifyCapturedFace(photoData);
    }
  };
  
  const verifyCapturedFace = async (photoData: string) => {
    try {
      setFaceVerificationStatus('verifying');
      setFaceVerificationMessage('Verifying face...');
      
      // First, detect if a face is present
      const detection = await detectFaces(photoData);
      
      if (!detection.success || detection.facesDetected === 0) {
        setFaceVerificationStatus('failed');
        setFaceVerificationMessage('No face detected. Please ensure your face is clearly visible.');
        return;
      }
      
      if (detection.facesDetected > 1) {
        setFaceVerificationStatus('failed');
        setFaceVerificationMessage('Multiple faces detected. Please ensure only your face is visible.');
        return;
      }
      
      // Verify face quality
      const qualityCheck = await verifyFaceQuality(photoData);
      if (!qualityCheck.success) {
        setFaceVerificationStatus('failed');
        setFaceVerificationMessage(`Face quality issue: ${qualityCheck.issues.join(', ')}`);
        return;
      }
      
      // Match face against registered employee
      const employeeId = getEmployeeId();
      const matchResult = await matchFace(photoData, employeeId || undefined);
      
      if (matchResult.success && matchResult.confidence >= 0.7) {
        setFaceVerificationStatus('verified');
        setFaceConfidence(matchResult.confidence);
        setFaceVerificationMessage(`Face verified successfully (${Math.round(matchResult.confidence * 100)}% confidence)`);
        setFaceNotEnrolled(false);
      } else {
        setFaceVerificationStatus('failed');
        setFaceConfidence(0);
        const errorMessage = matchResult.message || 'Face verification failed. Please try again.';
        setFaceVerificationMessage(errorMessage);
        
        // Check if the error indicates face is not enrolled
        const isNotEnrolled = errorMessage.toLowerCase().includes('not enrolled') || 
                              errorMessage.toLowerCase().includes('face is not enrolled') ||
                              errorMessage.toLowerCase().includes('no face enrolled');
        setFaceNotEnrolled(isNotEnrolled);
      }
    } catch (error) {
      console.error('Face verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Face verification failed';
      setFaceVerificationStatus('failed');
      setFaceVerificationMessage(errorMessage);
      
      // Check if the error indicates face is not enrolled
      const isNotEnrolled = errorMessage.toLowerCase().includes('not enrolled') || 
                            errorMessage.toLowerCase().includes('face is not enrolled') ||
                            errorMessage.toLowerCase().includes('no face enrolled');
      setFaceNotEnrolled(isNotEnrolled);
    }
  };
  
  const handleEnrollFace = async () => {
    if (!photoPreview) {
      setMarkAttendanceError('Please capture a photo first');
      return;
    }
    
    try {
      setIsEnrollingFace(true);
      setMarkAttendanceError(null);
      
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }
      
      // Verify face quality before enrollment
      const qualityCheck = await verifyFaceQuality(photoPreview);
      if (!qualityCheck.success) {
        throw new Error(`Face quality issue: ${qualityCheck.issues.join(', ')}. Please capture a better photo.`);
      }
      
      // Enroll the face
      const result = await enrollFace(
        employeeId,
        photoPreview,
        undefined, // employeeName - can be fetched if needed
        qualityCheck.quality
      );
      
      if (result.success) {
        setMarkAttendanceSuccess('Face enrolled successfully! You can now mark attendance.');
        setFaceNotEnrolled(false);
        setFaceVerificationStatus('idle');
        setFaceVerificationMessage(null);
        // Automatically verify the face after enrollment
        await verifyCapturedFace(photoPreview);
      } else {
        throw new Error(result.message || 'Face enrollment failed');
      }
    } catch (error) {
      console.error('Face enrollment error:', error);
      setMarkAttendanceError(error instanceof Error ? error.message : 'Face enrollment failed');
    } finally {
      setIsEnrollingFace(false);
    }
  };
  
  const handleBiometricVerification = async () => {
    if (!selectedBiometricDevice) {
      setMarkAttendanceError('Please select a biometric device');
      return;
    }
    
    try {
      setBiometricVerificationStatus('verifying');
      setMarkAttendanceError(null);
      
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      // Get location
      let location: { latitude: number; longitude: number } | null = null;
      if (isRemoteUser) {
        try {
          location = await validateLocation(true);
        } catch {
          console.log('Location not available for remote user, continuing without location');
        }
      } else {
        location = await validateLocation();
        if (!location) {
          throw new Error('Location validation failed. Please ensure you are within the office radius.');
        }
      }

      // Use new endpoint that handles verification and marking in one call
      const result = await markAttendanceWithFingerprint(
        employeeId,
        selectedBiometricDevice,
        location?.latitude,
        location?.longitude
      );
      
      if (result.success) {
        setBiometricVerificationStatus('verified');
        setBiometricConfidence(result.data?.confidence || 0);
        setMarkAttendanceSuccess(result.message || 'Attendance marked successfully');
        setPhotoPreview(null);
      } else {
        setBiometricVerificationStatus('failed');
        setBiometricConfidence(0);
        setMarkAttendanceError(result.message || 'Biometric verification failed');
      }
    } catch (error) {
      console.error('Biometric verification error:', error);
      setBiometricVerificationStatus('failed');
      setMarkAttendanceError(error instanceof Error ? error.message : 'Biometric verification failed');
    }
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
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'Failed to get location: ' + error.message;
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const validateLocation = async (skipValidation: boolean = false): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const location = await getCurrentLocation();
      
      // Skip distance validation for remote users
      if (skipValidation || isRemoteUser) {
        setLocationError(null);
        return location;
      }
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude
      );

      if (distance <= OFFICE_LOCATION.radius) {
        setLocationError(null);
        return location;
      }

      setLocationError(`You are ${Math.round(distance)}m away from office. Please mark attendance from within ${OFFICE_LOCATION.radius}m of office location.`);
      return null;
    } catch (error) {
      console.error('Location error:', error);
      // For remote users, if location fails, still allow attendance marking
      if (isRemoteUser) {
        setLocationError(null);
        return null; // Return null but don't show error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLocationError(errorMessage);
      return null;
    }
  };

  // Modify handleMarkAttendance to use actual location
  const handleMarkAttendance = async () => {
    try {
      setMarkingAttendance(true);
      setMarkAttendanceError(null);
      setLocationError(null);

      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }

      // Get current location - skip validation for remote users
      let location: { latitude: number; longitude: number } | null = null;
      if (isRemoteUser) {
        // For remote users, try to get location but don't require it
        try {
          location = await validateLocation(true);
        } catch {
          // If location fails for remote users, continue without it
          console.log('Location not available for remote user, continuing without location');
        }
      } else {
        // For office users, location validation is required
        location = await validateLocation();
        if (!location) {
          throw new Error('Location validation failed. Please ensure you are within the office radius.');
        }
      }

      // If facial recognition is enabled, use the new endpoint
      if (useFacialRecognition && photoPreview) {
        if (faceVerificationStatus !== 'verified') {
          throw new Error('Please verify your face before marking attendance');
        }

        // Use new endpoint that handles verification and marking in one call
        const result = await markAttendanceWithFace(
          employeeId,
          photoPreview, // Can be image or faceEncoding
          location?.latitude,
          location?.longitude
        );

        if (result.success) {
          const successMessage = result.message || 'Attendance marked successfully';
          setMarkAttendanceSuccess(successMessage);
          setPhotoPreview(null);
          setFaceVerificationStatus('idle');
          setFaceVerificationMessage(null);
          setFaceConfidence(0);
        } else {
          throw new Error(result.message || 'Failed to mark attendance');
        }
        return;
      }

      // If biometric device is enabled, it should be handled by handleBiometricVerification
      if (useBiometricDevice) {
        throw new Error('Please use the biometric device verification button');
      }

      // Fallback to old method if no biometric verification is enabled
      if (!photoPreview) {
        throw new Error('Please capture a photo first');
      }

      // Prepare request body - include location if available
      interface AttendanceRequestBody {
        photo: string;
        attendanceType: string;
        latitude?: number;
        longitude?: number;
        faceVerified?: boolean;
        biometricVerified?: boolean;
        faceConfidence?: number;
        biometricConfidence?: number;
        verificationMethod?: string;
      }
      
      // Determine verification method
      const faceVerified = useFacialRecognition && faceVerificationStatus === 'verified';
      const bioVerified = useBiometricDevice && biometricVerificationStatus === 'verified';
      let verificationMethod = 'none';
      if (faceVerified && bioVerified) {
        verificationMethod = 'both';
      } else if (faceVerified) {
        verificationMethod = 'face';
      } else if (bioVerified) {
        verificationMethod = 'biometric';
      }
      
      const requestBody: AttendanceRequestBody = {
        photo: photoPreview,
        attendanceType: isRemoteUser ? "remote" : "office",
        faceVerified,
        biometricVerified: bioVerified,
        faceConfidence: faceVerified ? faceConfidence : undefined,
        biometricConfidence: bioVerified ? biometricConfidence : undefined,
        verificationMethod,
      };

      // Only include location if we have it
      if (location) {
        requestBody.latitude = location.latitude;
        requestBody.longitude = location.longitude;
      }

      const response = await fetch(`https://cafm.zenapi.co.in/api/attendance/${employeeId}/mark-with-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestBody)
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
      <div className={`p-6 mb-6 border rounded-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/attendance/view')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Back to View Attendance"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <FaUserCheck className="text-xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mark Attendance</h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Mark your daily attendance</p>
            </div>
            <button
              onClick={() => router.push('/attendance/face-enrollment')}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                theme === 'dark' 
                  ? 'bg-purple-700 hover:bg-purple-600 text-purple-200' 
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
              }`}
              title="Enroll your face for attendance"
            >
              <FaUserShield className="w-4 h-4" />
              <span>Enroll Face</span>
            </button>
          </div>
          <button
            onClick={() => router.push('/attendance/view')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              theme === 'dark' 
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-200' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            }`}
          >
            Close Mark Attendance
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Photo Section */}
        <div className={`p-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <FaCamera className="text-blue-600 dark:text-blue-400" />
            Photo Verification
          </h3>
          <div className={`p-6 border-2 border-dashed rounded-lg ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600'
              : 'bg-gray-50 border-gray-300'
          }`}>
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
                  <div className="mb-4">
                    <div className={`rounded-full p-6 inline-block ${
                      theme === 'dark'
                        ? 'bg-blue-900'
                        : 'bg-blue-100'
                    }`}>
                      <FaCamera className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Ready to Capture</h3>
                  <p className={`mb-6 text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Please ensure you&apos;re in a well-lit area and facing the camera directly
                  </p>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <FaCamera className="w-4 h-4" />
                    <span>Start Camera</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status and Action Section */}
        <div className={`p-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <FaMapMarkerAlt className="text-blue-600 dark:text-blue-400" />
            Location Verification
          </h3>
          
          <div className="space-y-6">
            <div className={`p-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-gray-50 border-gray-200'
            }`}>
              {isRemoteUser ? (
                <>
                  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    <FaInfoCircle className="inline mr-2 text-blue-600 dark:text-blue-400" />
                    Remote user detected - Location verification is optional
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    You can mark attendance from any location
                  </p>
                </>
              ) : (
                <>
                  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    <FaInfoCircle className="inline mr-2 text-blue-600 dark:text-blue-400" />
                    Your device&apos;s location will be verified against your registered office location
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Please ensure your device&apos;s location services are enabled
                  </p>
                </>
              )}
            </div>

            <div className="space-y-4">
              {/* Facial Recognition Status */}
              {useFacialRecognition && photoPreview && (
                <div className={`p-3 rounded-lg border ${
                  faceVerificationStatus === 'verified'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700'
                    : faceVerificationStatus === 'failed'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {faceVerificationStatus === 'verifying' && (
                      <FaSpinner className="animate-spin w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                    {faceVerificationStatus === 'verified' && (
                      <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                    {faceVerificationStatus === 'failed' && (
                      <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    {faceVerificationStatus === 'idle' && (
                      <FaUserShield className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                    <p className={`text-sm ${
                      faceVerificationStatus === 'verified'
                        ? 'text-green-800 dark:text-green-200'
                        : faceVerificationStatus === 'failed'
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {faceVerificationMessage || 'Face verification pending...'}
                    </p>
                  </div>
                  {faceVerificationStatus === 'failed' && (
                    <div className="mt-2 flex flex-col gap-2">
                      {faceNotEnrolled ? (
                        <>
                          <button
                            onClick={handleEnrollFace}
                            disabled={isEnrollingFace}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isEnrollingFace
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isEnrollingFace ? (
                              <>
                                <FaSpinner className="animate-spin w-4 h-4" />
                                <span>Enrolling...</span>
                              </>
                            ) : (
                              <>
                                <FaUserShield className="w-4 h-4" />
                                <span>Enroll Face</span>
                              </>
                            )}
                          </button>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Your face is not enrolled. Click above to enroll using this photo.
                          </p>
                        </>
                      ) : (
                        <button
                          onClick={() => verifyCapturedFace(photoPreview)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Retry Verification
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Secureye Connection Helper */}
              <SecureyeConnectionHelper
                onScanDevices={() => handleScanDevices(false)}
                isScanning={false}
                deviceConnected={!!selectedBiometricDevice && biometricVerificationStatus === 'verified'}
              />

              {/* Biometric Device Selection */}
              {availableBiometricDevices.length > 0 && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium flex items-center gap-2 ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      <FaFingerprint className="text-blue-600 dark:text-blue-400" />
                      Use Biometric Device
                    </label>
                    <input
                      type="checkbox"
                      checked={useBiometricDevice}
                      onChange={(e) => {
                        setUseBiometricDevice(e.target.checked);
                        setBiometricVerificationStatus('idle');
                      }}
                      className="rounded"
                    />
                  </div>
                  {useBiometricDevice && (
                    <select
                      value={selectedBiometricDevice || ''}
                      onChange={(e) => setSelectedBiometricDevice(e.target.value)}
                      className={`w-full mt-2 px-3 py-2 rounded-lg text-sm ${
                        theme === 'dark'
                          ? 'bg-gray-600 text-gray-200 border-gray-500'
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                    >
                      <option value="">Select device...</option>
                      {availableBiometricDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.name} ({device.type})
                          {device.manufacturer && device.manufacturer !== 'Unknown' && ` - ${device.manufacturer}`}
                        </option>
                      ))}
                    </select>
                  )}
                  {useBiometricDevice && selectedBiometricDevice && biometricVerificationStatus !== 'verified' && (
                    <button
                      onClick={handleBiometricVerification}
                      disabled={biometricVerificationStatus === 'verifying'}
                      className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        biometricVerificationStatus === 'verifying'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {biometricVerificationStatus === 'verifying' ? (
                        <>
                          <FaSpinner className="animate-spin inline mr-2" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <FaFingerprint className="inline mr-2" />
                          Verify with Secureye Device
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              
              {/* Show scan button if no devices found */}
              {availableBiometricDevices.length === 0 && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    No biometric devices found. Click below to scan for your Secureye device.
                  </p>
                  <button
                    onClick={() => handleScanDevices(false)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <FaFingerprint className="inline mr-2" />
                    Scan for Devices
                  </button>
                  {typeof window !== 'undefined' && 'serial' in navigator && (
                    <button
                      onClick={() => handleScanDevices(true)}
                      className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        theme === 'dark'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      <FaFingerprint className="inline mr-2" />
                      Scan Serial Port (Chrome/Edge)
                    </button>
                  )}
                </div>
              )}
              
              {markAttendanceError && (
                <FeedbackMessage message={markAttendanceError} type="error" />
              )}
              {markAttendanceSuccess && (
                <div className="space-y-3">
                  <FeedbackMessage message={markAttendanceSuccess} type="success" />
                  <button
                    onClick={() => router.push('/attendance/view')}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    <span>Back to View Attendance</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add location error message - only show for non-remote users */}
            {locationError && !isRemoteUser && (
              <FeedbackMessage message={locationError} type="error" />
            )}

            <button
              onClick={handleMarkAttendance}
              disabled={
                markingAttendance || 
                !photoPreview || 
                (useFacialRecognition && faceVerificationStatus !== 'verified') ||
                (useBiometricDevice && biometricVerificationStatus !== 'verified')
              }
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                markingAttendance || 
                !photoPreview || 
                (useFacialRecognition && faceVerificationStatus !== 'verified') ||
                (useBiometricDevice && biometricVerificationStatus !== 'verified')
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
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
