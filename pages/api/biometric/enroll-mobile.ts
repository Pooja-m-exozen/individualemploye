import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Enroll biometric data from mobile devices
 * POST /api/biometric/enroll-mobile
 * 
 * Accepts fingerprint templates directly from mobile devices
 * (camera capture, USB scanner, or third-party SDK)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeId, biometricTemplate, biometricType = 'fingerprint', qualityScore, imageData } = req.body;

    if (!employeeId || !biometricTemplate) {
      return res.status(400).json({ 
        error: 'Employee ID and biometric template are required',
        details: 'biometricTemplate should be a Base64-encoded fingerprint template'
      });
    }

    // Build request body - only include qualityScore if explicitly provided
    // Backend should calculate quality from the actual biometric data
    interface RequestBody {
      employeeId: string;
      biometricTemplate: string;
      biometricType: string;
      qualityScore?: number;
      imageData?: string;
    }
    
    const requestBody: RequestBody = {
      employeeId,
      biometricTemplate,
      biometricType,
    };
    
    // Only include qualityScore if explicitly provided (backend will calculate from data if not provided)
    if (qualityScore !== undefined && qualityScore !== null) {
      requestBody.qualityScore = qualityScore;
    }
    
    if (imageData) {
      requestBody.imageData = imageData;
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/biometric/enroll-mobile`, {
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

    return res.status(200).json({
      success: true,
      message: data.message || 'Biometric enrolled successfully from mobile',
      data: data.data,
    });
  } catch (error) {
    console.error('Mobile biometric enrollment error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

