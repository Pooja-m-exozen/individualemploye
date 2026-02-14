import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    const imageResponse = await fetch(url);

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ error: `Failed to fetch image from ${url}` });
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
        return res.status(400).json({ error: 'URL does not point to a valid image' });
    }

    // Add CORS and cache headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', contentType);
    const imageBuffer = await imageResponse.arrayBuffer();
    res.send(Buffer.from(imageBuffer));
    
  } catch (error) {
    console.error('Proxy image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}