import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  // Resolve relative URLs to absolute URLs
  if (url.startsWith('/')) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    url = `${protocol}://${host}${url}`;
  }

  try {
    const response = await fetch(url, { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error('Failed to fetch image');
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="image".' + (contentType.split('/')[1] || 'png'));
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy image error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}