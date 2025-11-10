import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Enroll face for an employee
 * POST /api/facial-recognition/enroll
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeId, employeeName, image, faceEncoding, qualityScore, provider = 'face-api' } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Support both old format (image) and new format (faceEncoding)
    if (!image && !faceEncoding) {
      return res.status(400).json({ error: 'Either image or faceEncoding is required' });
    }

    // Build request body - prefer faceEncoding if provided
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
      provider,
    };

    if (employeeName) {
      requestBody.employeeName = employeeName;
    }

    if (faceEncoding) {
      requestBody.faceEncoding = faceEncoding;
    } else if (image) {
      requestBody.image = image;
    }

    if (qualityScore !== undefined && qualityScore !== null) {
      requestBody.qualityScore = qualityScore;
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/facial-recognition/enroll`, {
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
    console.error('Face enrollment error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

