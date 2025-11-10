import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Match biometric data against enrolled templates
 * POST /api/biometric/match
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deviceId, type, biometricData, employeeId, threshold = 0.7 } = req.body;

    if (!deviceId || !type || !biometricData) {
      return res.status(400).json({ error: 'Device ID, type, and biometric data are required' });
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/biometric/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify({ deviceId, type, biometricData, employeeId, threshold }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Biometric matching error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

