import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Mark attendance with fingerprint verification for specific employee
 * POST /api/biometric/mark-attendance/:employeeId/:deviceId
 * 
 * Flow:
 * 1. Checks if fingerprint is enrolled for the employee ID
 * 2. If not enrolled: returns an error message
 * 3. If enrolled: captures fingerprint from the device and matches it
 * 4. If matches: submits attendance
 * 5. If doesn't match: returns an error
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeId, deviceId } = req.query;
    const { latitude, longitude } = req.body;

    if (!employeeId || typeof employeeId !== 'string') {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Build request body
    interface RequestBody {
      latitude?: number;
      longitude?: number;
    }
    
    const requestBody: RequestBody = {};

    if (latitude !== undefined && latitude !== null) {
      requestBody.latitude = latitude;
    }

    if (longitude !== undefined && longitude !== null) {
      requestBody.longitude = longitude;
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/biometric/mark-attendance/${employeeId}/${deviceId}`, {
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
    console.error('Biometric attendance marking error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

