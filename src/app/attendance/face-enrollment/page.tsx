'use client';

import { useState, useCallback } from 'react';
import { FaCamera, FaSpinner, FaCheckCircle, FaExclamationCircle, FaUserShield, FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
import { isAuthenticated, getEmployeeId } from '@/services/auth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Image from 'next/image';
import { useTheme } from "@/context/ThemeContext";
import { enrollFace, detectFaces, verifyFaceQuality } from '@/services/facialRecognition';

// Camera Modal Component
const CameraModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean; onClose: () => void; onCapture: (photo: string) => void }) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const capturePhoto = useCallback(async () => {
    let mediaStream: MediaStream | null = null;
    try {
      setIsCapturing(true);
      setCameraError(null);
      
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.play();

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(photoData);
      }

      mediaStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error capturing photo:', error);
      setCameraError('Failed to access camera. Please check permissions.');
    } finally {
      setIsCapturing(false);
    }
  }, [facingMode, onCapture]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Capture Photo</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaExclamationCircle className="w-6 h-6" />
          </button>
        </div>
        
        {cameraError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded">
            {cameraError}
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Switch Camera ({facingMode === 'user' ? 'Front' : 'Back'})
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCapturing ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Capturing...</span>
              </>
            ) : (
              <>
                <FaCamera />
                <span>Capture Photo</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function FaceEnrollmentPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'idle' | 'checking' | 'ready' | 'enrolling' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check authentication
  if (typeof window !== 'undefined' && !isAuthenticated()) {
    router.push('/login');
    return null;
  }

  const handlePhotoCapture = async (photoData: string) => {
    if (!photoData.startsWith('data:image/')) {
      setError('Invalid photo format');
      return;
    }
    
    setPhotoPreview(photoData);
    setError(null);
    setSuccess(null);
    setStatusMessage(null);
    setEnrollmentStatus('checking');
    
    // Check face quality
    try {
      setStatusMessage('Checking face quality...');
      
      // Detect faces
      const detection = await detectFaces(photoData);
      if (!detection.success || detection.facesDetected === 0) {
        setEnrollmentStatus('failed');
        setError('No face detected. Please ensure your face is clearly visible.');
        return;
      }
      
      if (detection.facesDetected > 1) {
        setEnrollmentStatus('failed');
        setError('Multiple faces detected. Please ensure only your face is visible.');
        return;
      }
      
      // Verify face quality
      const qualityCheck = await verifyFaceQuality(photoData);
      if (!qualityCheck.success) {
        setEnrollmentStatus('failed');
        setError(`Face quality issue: ${qualityCheck.issues.join(', ')}. Please capture a better photo.`);
        return;
      }
      
      setEnrollmentStatus('ready');
      setStatusMessage(`Face quality is good (${Math.round(qualityCheck.quality * 100)}%). Ready to enroll.`);
    } catch (err) {
      setEnrollmentStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to check face quality');
    }
  };

  const handleEnroll = async () => {
    if (!photoPreview) {
      setError('Please capture a photo first');
      return;
    }
    
    try {
      setIsEnrolling(true);
      setError(null);
      setSuccess(null);
      setEnrollmentStatus('enrolling');
      setStatusMessage('Enrolling your face...');
      
      const employeeId = getEmployeeId();
      if (!employeeId) {
        throw new Error('Employee ID not found. Please login again.');
      }
      
      // Verify face quality again before enrollment
      const qualityCheck = await verifyFaceQuality(photoPreview);
      if (!qualityCheck.success) {
        throw new Error(`Face quality issue: ${qualityCheck.issues.join(', ')}. Please capture a better photo.`);
      }
      
      // Enroll the face
      const result = await enrollFace(
        employeeId,
        photoPreview,
        undefined, // employeeName
        qualityCheck.quality
      );
      
      if (result.success) {
        setEnrollmentStatus('success');
        setSuccess('Face enrolled successfully! You can now use face recognition for attendance.');
        setStatusMessage('Face enrollment completed successfully.');
        // Clear photo after successful enrollment
        setTimeout(() => {
          setPhotoPreview(null);
          setEnrollmentStatus('idle');
        }, 3000);
      } else {
        throw new Error(result.message || 'Face enrollment failed');
      }
    } catch (err) {
      setEnrollmentStatus('failed');
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string'
        ? err
        : 'Face enrollment failed. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Face enrollment error details:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`p-6 mb-6 border rounded-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/attendance/view')}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title="Back to Attendance"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <FaUserShield className="text-xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Face Enrollment
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Register your face for attendance verification
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
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
              Capture Photo
            </h3>
            
            <div className={`p-6 border-2 border-dashed rounded-lg ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-gray-50 border-gray-300'
            }`}>
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
                      onClick={() => {
                        setPhotoPreview(null);
                        setEnrollmentStatus('idle');
                        setStatusMessage(null);
                        setError(null);
                      }}
                      className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg transform hover:scale-110"
                      title="Retake photo"
                    >
                      <FaExclamationCircle className="w-6 h-6" />
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

          {/* Status and Action Section */}
          <div className={`p-6 border rounded-lg ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <FaUserShield className="text-blue-600 dark:text-blue-400" />
              Enrollment Status
            </h3>

            <div className="space-y-4">
              {/* Instructions */}
              <div className={`p-3 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className={`font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                      Instructions:
                    </p>
                    <ul className={`list-disc list-inside space-y-1 text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <li>Ensure good lighting</li>
                      <li>Face the camera directly</li>
                      <li>Remove glasses or hat if possible</li>
                      <li>Keep a neutral expression</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`p-3 rounded-lg border ${
                  enrollmentStatus === 'success'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700'
                    : enrollmentStatus === 'failed'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700'
                    : enrollmentStatus === 'checking' || enrollmentStatus === 'enrolling'
                    ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {enrollmentStatus === 'checking' || enrollmentStatus === 'enrolling' ? (
                      <FaSpinner className="animate-spin w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    ) : enrollmentStatus === 'success' ? (
                      <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : enrollmentStatus === 'failed' ? (
                      <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <FaUserShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <p className={`text-sm ${
                      enrollmentStatus === 'success'
                        ? 'text-green-800 dark:text-green-200'
                        : enrollmentStatus === 'failed'
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {statusMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className={`p-3 rounded-lg border bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700`}>
                  <div className="flex items-start gap-2">
                    <FaExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Error enrolling face</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Please check:
                        <br />• Your internet connection
                        <br />• That you&apos;re logged in
                        <br />• Try capturing a new photo with better lighting
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className={`p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700`}>
                  <div className="flex items-center gap-2">
                    <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                  </div>
                </div>
              )}

              {/* Enroll Button */}
              {enrollmentStatus === 'ready' && (
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    isEnrolling
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isEnrolling ? (
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
              )}
            </div>
          </div>
        </div>

        {/* Camera Modal */}
        <CameraModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={(photo) => {
            setShowCameraModal(false);
            handlePhotoCapture(photo);
          }}
        />
      </div>
    </DashboardLayout>
  );
}

