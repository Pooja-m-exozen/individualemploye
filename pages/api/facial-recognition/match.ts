import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Match face against registered employees
 * POST /api/facial-recognition/match
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, employeeId, provider = 'face-api', threshold = 0.7 } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Proxy to backend service
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/facial-recognition/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify({ image, employeeId, provider, threshold }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Face matching error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

