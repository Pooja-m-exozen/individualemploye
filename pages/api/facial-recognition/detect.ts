import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Detect faces in an image
 * POST /api/facial-recognition/detect
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, provider = 'face-api' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Option 1: Use Face-API.js (client-side) - this is a proxy
    // Option 2: Use AWS Rekognition
    // Option 3: Use Azure Face API
    // Option 4: Use FaceIO

    // For now, return a placeholder response
    // You'll need to implement the actual face detection logic based on your chosen provider
    
    // Proxy to backend service
    // Note: Client-side detection is preferred and will be used automatically in the browser
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/facial-recognition/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify({ image, provider }),
    });

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      // If backend returns "not yet integrated" error, provide helpful message
      if (data.error && data.error.includes('not yet integrated')) {
        return res.status(503).json({
          success: false,
          message: 'Face detection service is not available on the backend. Client-side detection should be used instead.',
          error: data.error,
          fallback: 'Use client-side face detection (face-api.js) which is automatically enabled in the browser.',
        });
      }
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Face detection error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

