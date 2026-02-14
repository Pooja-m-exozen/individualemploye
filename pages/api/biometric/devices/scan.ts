import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Scan for available biometric devices
 * GET /api/biometric/devices/scan
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Proxy to backend service that communicates with device drivers
    const backendResponse = await fetch(`${process.env.API_URL || 'https://cafm.zenapi.co.in/api'}/biometric/devices/scan`, {
      method: 'GET',
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
    });

    // Check if response is JSON
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await backendResponse.text();
      console.error('Backend returned non-JSON response:', text.substring(0, 200));
      
      // If backend returns HTML (error page), return helpful error
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        if (backendResponse.status === 404) {
          return res.status(404).json({ 
            error: 'Endpoint not found',
            message: 'The biometric device scan endpoint is not implemented on the backend. Please implement GET /api/biometric/devices/scan'
          });
        } else if (backendResponse.status === 401 || backendResponse.status === 403) {
          return res.status(backendResponse.status).json({ 
            error: 'Authentication failed',
            message: 'Invalid or expired authentication token'
          });
        } else {
          return res.status(backendResponse.status).json({ 
            error: 'Backend error',
            message: `Backend returned HTML instead of JSON. Status: ${backendResponse.status}. The endpoint may not be implemented yet.`
          });
        }
      }
      
      return res.status(500).json({ 
        error: 'Invalid response',
        message: 'Backend returned invalid response format'
      });
    }

    const data = await backendResponse.json();
    
    if (!backendResponse.ok) {
      return res.status(backendResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Device scan error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

