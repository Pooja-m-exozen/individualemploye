/**
 * Client-side Face Detection using face-api.js
 * This provides face detection capabilities without requiring backend integration
 */

// Dynamic import for face-api.js (browser only)
let faceapi: typeof import('face-api.js') | null = null;

async function getFaceApi() {
  if (typeof window === 'undefined') {
    throw new Error('face-api.js can only be used in the browser');
  }
  
  if (!faceapi) {
    faceapi = await import('face-api.js');
  }
  
  return faceapi;
}

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Load face-api.js models
 * These models need to be placed in the public folder
 */
async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const faceapiLib = await getFaceApi();
    
    // Try local models first (if available)
    const LOCAL_MODEL_URL = '/models';
    
    // CDN URLs as fallback (GitHub raw content - most reliable for face-api.js)
    const CDN_MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    
    let modelUrl = LOCAL_MODEL_URL;
    let lastError: Error | null = null;

    // Try local first
    try {
      await Promise.all([
        faceapiLib.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapiLib.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapiLib.nets.faceRecognitionNet.loadFromUri(modelUrl),
        faceapiLib.nets.faceExpressionNet.loadFromUri(modelUrl),
      ]);
      modelsLoaded = true;
      console.log('Face-api.js models loaded successfully from local');
      return;
    } catch (localError) {
      console.warn('Local models not found, trying CDN...', localError);
      lastError = localError as Error;
      // Fallback to CDN
      modelUrl = CDN_MODEL_URL;
    }

    // Try CDN
    try {
      await Promise.all([
        faceapiLib.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapiLib.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapiLib.nets.faceRecognitionNet.loadFromUri(modelUrl),
        faceapiLib.nets.faceExpressionNet.loadFromUri(modelUrl),
      ]);
      modelsLoaded = true;
      console.log('Face-api.js models loaded successfully from CDN');
      return;
    } catch (cdnError) {
      console.error('Failed to load models from CDN:', cdnError);
      lastError = cdnError as Error;
    }

    // If all attempts failed
    throw new Error(
      `Failed to load face detection models. Tried local (/models) and CDN. ` +
      `Please ensure you have an internet connection or download models and place them in public/models folder. ` +
      `Error: ${lastError?.message || 'Unknown error'}`
    );
  })();

  return loadingPromise;
}

/**
 * Convert base64 image to HTMLImageElement
 */
function base64ToImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Detect faces in an image using face-api.js
 */
export async function detectFacesClientSide(
  imageData: string
): Promise<{
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
  }[];
  message: string;
}> {
  try {
    // Load models if not already loaded
    await loadModels();

    // Get face-api.js library
    const faceapiLib = await getFaceApi();

    // Convert base64 to image
    const img = await base64ToImage(imageData);

    // Detect faces with landmarks
    const detections = await faceapiLib
      .detectAllFaces(img, new faceapiLib.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        success: false,
        facesDetected: 0,
        message: 'No face detected. Please ensure your face is clearly visible.',
      };
    }

    // Convert detections to our format
    const faceData = detections.map((detection) => {
      const box = detection.detection.box;
      const landmarks = detection.landmarks;

      return {
        boundingBox: {
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
        },
        landmarks: landmarks.positions.map((pos, index) => ({
          x: pos.x,
          y: pos.y,
          type: `landmark_${index}`,
        })),
        quality: detection.detection.score || 0.8, // Confidence score
      };
    });

    return {
      success: true,
      facesDetected: detections.length,
      faceData,
      message: `${detections.length} face(s) detected successfully`,
    };
  } catch (error) {
    console.error('Client-side face detection error:', error);
    return {
      success: false,
      facesDetected: 0,
      message: error instanceof Error ? error.message : 'Face detection failed',
    };
  }
}

/**
 * Extract face descriptor (encoding) from an image
 * This can be used for face matching
 */
export async function extractFaceDescriptor(
  imageData: string
): Promise<{
  success: boolean;
  descriptor?: Float32Array;
  message: string;
}> {
  try {
    // Load models if not already loaded
    await loadModels();

    // Get face-api.js library
    const faceapiLib = await getFaceApi();

    // Convert base64 to image
    const img = await base64ToImage(imageData);

    // Detect face and extract descriptor
    const detection = await faceapiLib
      .detectSingleFace(img, new faceapiLib.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return {
        success: false,
        message: 'No face detected in the image',
      };
    }

    return {
      success: true,
      descriptor: detection.descriptor,
      message: 'Face descriptor extracted successfully',
    };
  } catch (error) {
    console.error('Face descriptor extraction error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to extract face descriptor',
    };
  }
}

/**
 * Calculate face quality score
 */
export async function calculateFaceQuality(
  imageData: string
): Promise<{
  success: boolean;
  quality: number;
  issues: string[];
  message: string;
}> {
  try {
    const detectionResult = await detectFacesClientSide(imageData);

    if (!detectionResult.success || detectionResult.facesDetected === 0) {
      return {
        success: false,
        quality: 0,
        issues: ['No face detected'],
        message: 'No face detected in the image',
      };
    }

    if (detectionResult.facesDetected > 1) {
      return {
        success: false,
        quality: 0,
        issues: ['Multiple faces detected'],
        message: 'Multiple faces detected. Please ensure only one face is visible.',
      };
    }

    const faceData = detectionResult.faceData?.[0];
    if (!faceData) {
      return {
        success: false,
        quality: 0,
        issues: ['Unable to process face data'],
        message: 'Unable to process face data',
      };
    }

    const issues: string[] = [];
    let quality = faceData.quality || 0.7;

    // Check face size (should be at least 100x100 pixels)
    if (faceData.boundingBox.width < 100 || faceData.boundingBox.height < 100) {
      issues.push('Face is too small');
      quality -= 0.2;
    }

    // Check if face is centered (rough check)
    // This is a simplified check - you can make it more sophisticated
    if (faceData.landmarks && faceData.landmarks.length < 68) {
      issues.push('Face landmarks not fully detected');
      quality -= 0.1;
    }

    quality = Math.max(0, Math.min(1, quality));

    return {
      success: quality >= 0.7,
      quality,
      issues,
      message: quality >= 0.7 ? 'Face quality is good' : 'Face quality needs improvement',
    };
  } catch (error) {
    console.error('Face quality calculation error:', error);
    return {
      success: false,
      quality: 0,
      issues: ['Unable to calculate quality'],
      message: error instanceof Error ? error.message : 'Failed to calculate face quality',
    };
  }
}

