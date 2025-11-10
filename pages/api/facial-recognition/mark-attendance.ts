import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Mark attendance with face verification
 * POST /api/facial-recognition/mark-attendance
 * 
 * Flow:
 * 1. Checks if face is enrolled for the employee ID
 * 2. If not enrolled: returns "Your face is not enrolled"
 * 3. If enrolled: matches the provided face against the enrolled face
 * 4. If doesn't match: returns "Doesn't match"
 * 5. If matches: submits attendance
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeId, faceEncoding, image, latitude, longitude } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Support both faceEncoding and image formats
    if (!faceEncoding && !image) {
      return res.status(400).json({ error: 'Either faceEncoding or image is required' });
    }

    // Build request body
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

    if (faceEncoding) {
      requestBody.faceEncoding = faceEncoding;
    } else if (image) {
      requestBody.image = image;
    }

    if (latitude !== undefined && latitude !== null) {
      requestBody.latitude = latitude;
    }

    if (longitude !== undefined && longitude !== null) {
      requestBody.longitude = longitude;
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/facial-recognition/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Face attendance marking error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

