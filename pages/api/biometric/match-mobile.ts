import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Match biometric data from mobile devices
 * POST /api/biometric/match-mobile
 * 
 * Matches fingerprint templates from mobile devices against enrolled templates
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { biometricTemplate, employeeId, threshold = 0.7, biometricType = 'fingerprint' } = req.body;

    if (!biometricTemplate) {
      return res.status(400).json({ 
        error: 'Biometric template is required',
        details: 'biometricTemplate should be a Base64-encoded fingerprint template'
      });
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/biometric/match-mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify({
        biometricTemplate,
        employeeId, // Optional: verify against specific employee
        threshold,
        biometricType,
      }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json({
      success: true,
      matched: data.matched || false,
      employeeId: data.employeeId,
      confidence: data.confidence || 0,
      message: data.message || (data.matched ? 'Biometric matched successfully' : 'Biometric not recognized'),
    });
  } catch (error) {
    console.error('Mobile biometric matching error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

