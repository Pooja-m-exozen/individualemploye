/**
 * Facial Recognition Service
 * Supports multiple providers: AWS Rekognition, Azure Face API, FaceIO, Face-API.js
 */

// Dynamic import for client-side face detection
let faceDetectionUtils: typeof import('@/utils/faceDetection') | null = null;

// Lazy load face detection utils (only in browser)
async function getFaceDetectionUtils() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!faceDetectionUtils) {
    try {
      faceDetectionUtils = await import('@/utils/faceDetection');
    } catch (error) {
      console.warn('Failed to load client-side face detection utils:', error);
      return null;
    }
  }
  
  return faceDetectionUtils;
}

export interface FaceMatchResult {
  success: boolean;
  confidence: number;
  employeeId?: string;
  employeeName?: string;
  message: string;
  faceId?: string;
}

export interface FaceDetectionResult {
  success: boolean;
  facesDetected: number;
  faceData?: {
    boundingBox: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    landmarks?: Array<{ x: number; y: number; type: string }>;
    quality?: number;
  };
  message: string;
}

// Configuration - Set these in your environment variables
const FACIAL_RECOGNITION_CONFIG = {
  provider: process.env.NEXT_PUBLIC_FACE_RECOGNITION_PROVIDER || 'face-api', // 'aws', 'azure', 'faceio', 'face-api'
  aws: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
    collectionId: process.env.NEXT_PUBLIC_AWS_REKOGNITION_COLLECTION_ID || 'employee-faces',
  },
  azure: {
    endpoint: process.env.NEXT_PUBLIC_AZURE_FACE_ENDPOINT || '',
    subscriptionKey: process.env.NEXT_PUBLIC_AZURE_FACE_KEY || '',
  },
  faceio: {
    appId: process.env.NEXT_PUBLIC_FACEIO_APP_ID || '',
  },
  backend: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://cafm.zenapi.co.in/api',
  },
};

/**
 * Detect faces in an image
 * Tries client-side detection first, falls back to backend API
 */
export async function detectFaces(imageData: string): Promise<FaceDetectionResult> {
  try {
    // Try client-side detection first (only in browser)
    if (typeof window !== 'undefined') {
      const utils = await getFaceDetectionUtils();
      if (utils) {
        try {
          const result = await utils.detectFacesClientSide(imageData);
          if (result.success) {
            return {
              success: result.success,
              facesDetected: result.facesDetected,
              faceData: result.faceData?.[0], // Return first face data
              message: result.message,
            };
          }
          // If client-side fails, fall through to backend
        } catch (clientError) {
          console.warn('Client-side face detection failed, trying backend:', clientError);
          // Fall through to backend API
        }
      }
    }

    // Fallback to backend API
    const response = await fetch(`${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        image: imageData,
        provider: FACIAL_RECOGNITION_CONFIG.provider,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      // If backend also fails with "not yet integrated" error, return a helpful message
      if (data.error && data.error.includes('not yet integrated')) {
        return {
          success: false,
          facesDetected: 0,
          message: 'Face detection service is not available. Please try again or contact support.',
        };
      }
      throw new Error(data.message || 'Face detection failed');
    }

    return {
      success: true,
      facesDetected: data.facesDetected || 0,
      faceData: data.faceData,
      message: data.message || 'Face detected successfully',
    };
  } catch (error) {
    console.error('Face detection error:', error);
    return {
      success: false,
      facesDetected: 0,
      message: error instanceof Error ? error.message : 'Face detection failed',
    };
  }
}

/**
 * Match face against registered employees
 */
export async function matchFace(
  imageData: string,
  employeeId?: string
): Promise<FaceMatchResult> {
  try {
    const response = await fetch(`${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        image: imageData,
        employeeId, // Optional: if provided, verify against specific employee
        provider: FACIAL_RECOGNITION_CONFIG.provider,
        threshold: 0.7, // Minimum confidence threshold (70%)
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Face matching failed');
    }

    return {
      success: data.matched || false,
      confidence: data.confidence || 0,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      message: data.message || (data.matched ? 'Face matched successfully' : 'Face not recognized'),
      faceId: data.faceId,
    };
  } catch (error) {
    console.error('Face matching error:', error);
    return {
      success: false,
      confidence: 0,
      message: error instanceof Error ? error.message : 'Face matching failed',
    };
  }
}

/**
 * Register/Enroll a face for an employee
 * Supports both image and faceEncoding formats
 */
export async function enrollFace(
  employeeId: string,
  imageDataOrEncoding: string | number[],
  employeeName?: string,
  qualityScore?: number
): Promise<{ success: boolean; message: string; faceId?: string }> {
  try {
    // Determine if input is faceEncoding (array) or image (string)
    const isFaceEncoding = Array.isArray(imageDataOrEncoding);
    
    interface RequestBody {
      employeeId: string;
      provider: string;
      employeeName?: string;
      faceEncoding?: number[];
      image?: string;
      qualityScore?: number;
    }
    
    const requestBody: RequestBody = {
      employeeId,
      provider: FACIAL_RECOGNITION_CONFIG.provider,
    };

    if (employeeName) {
      requestBody.employeeName = employeeName;
    }

    if (isFaceEncoding) {
      requestBody.faceEncoding = imageDataOrEncoding;
    } else {
      requestBody.image = imageDataOrEncoding;
    }

    if (qualityScore !== undefined && qualityScore !== null) {
      requestBody.qualityScore = qualityScore;
    }

    // Use Next.js API route as proxy to backend (with basePath if configured)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/v1/employee';
    const apiUrl = typeof window !== 'undefined' 
      ? `${basePath}/api/facial-recognition/enroll`
      : `${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/enroll`;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(requestBody),
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, get text
      const text = await response.text();
      throw new Error(`Server error: ${response.status} ${response.statusText}. ${text}`);
    }
    
    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('Face enrollment API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      throw new Error(errorMessage);
    }

    return {
      success: true,
      message: data.message || 'Face enrolled successfully',
      faceId: data.faceId,
    };
  } catch (error) {
    console.error('Face enrollment error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string'
      ? error
      : 'Face enrollment failed. Please check your connection and try again.';
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Delete enrolled face for an employee
 */
export async function deleteEnrolledFace(employeeId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/delete/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Face deletion failed');
    }

    return {
      success: true,
      message: data.message || 'Face deleted successfully',
    };
  } catch (error) {
    console.error('Face deletion error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Face deletion failed',
    };
  }
}

/**
 * Verify face quality before enrollment
 * Tries client-side verification first, falls back to backend API
 */
export async function verifyFaceQuality(imageData: string): Promise<{
  success: boolean;
  quality: number;
  issues: string[];
  message: string;
}> {
  try {
    // Try client-side quality check first (only in browser)
    if (typeof window !== 'undefined') {
      const utils = await getFaceDetectionUtils();
      if (utils) {
        try {
          const result = await utils.calculateFaceQuality(imageData);
          if (result.success || result.quality > 0) {
            return result;
          }
          // If client-side fails, fall through to backend
        } catch (clientError) {
          console.warn('Client-side quality check failed, trying backend:', clientError);
          // Fall through to backend API
        }
      }
    }

    // Fallback to backend API
    const response = await fetch(`${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/verify-quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        image: imageData,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Quality verification failed');
    }

    return {
      success: data.quality >= 0.7,
      quality: data.quality || 0,
      issues: data.issues || [],
      message: data.message || 'Quality check completed',
    };
  } catch (error) {
    console.error('Quality verification error:', error);
    return {
      success: false,
      quality: 0,
      issues: ['Unable to verify quality'],
      message: error instanceof Error ? error.message : 'Quality verification failed',
    };
  }
}

/**
 * Mark attendance with face verification
 * Flow:
 * 1. Checks if face is enrolled for the employee ID
 * 2. If not enrolled: returns "Your face is not enrolled"
 * 3. If enrolled: matches the provided face against the enrolled face
 * 4. If doesn't match: returns "Doesn't match"
 * 5. If matches: submits attendance
 */
export async function markAttendanceWithFace(
  employeeId: string,
  imageDataOrEncoding: string | number[],
  latitude?: number,
  longitude?: number
): Promise<{
  success: boolean;
  message: string;
  data?: {
    employeeId: string;
    employeeName?: string;
    attendanceType: 'punch-in' | 'punch-out';
    timestamp: string;
    confidence?: number;
  };
}> {
  try {
    // Determine if input is faceEncoding (array) or image (string)
    const isFaceEncoding = Array.isArray(imageDataOrEncoding);
    
    interface RequestBody {
      employeeId: string;
      faceEncoding?: number[];
      image?: string;
      latitude?: number;
      longitude?: number;
    }
    
    const requestBody: RequestBody = {
      employeeId,
    };

    if (isFaceEncoding) {
      requestBody.faceEncoding = imageDataOrEncoding;
    } else {
      requestBody.image = imageDataOrEncoding;
    }

    if (latitude !== undefined && latitude !== null) {
      requestBody.latitude = latitude;
    }

    if (longitude !== undefined && longitude !== null) {
      requestBody.longitude = longitude;
    }

    const response = await fetch(`${FACIAL_RECOGNITION_CONFIG.backend.apiUrl}/facial-recognition/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to mark attendance with face verification');
    }

    return {
      success: true,
      message: data.message || 'Attendance marked successfully',
      data: data.data,
    };
  } catch (error) {
    console.error('Face attendance marking error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to mark attendance with face verification',
    };
  }
}

