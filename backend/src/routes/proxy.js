const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const https = require('https');
const http = require('http');

/**
 * Image Proxy Route
 * Fetches images from external URLs to bypass CORS restrictions
 * Returns base64-encoded image data
 */
router.post('/image', authenticateToken, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Image URL is required'
    });
  }

  try {
    // Check if it's a local/relative URL (doesn't need proxying)
    if (url.startsWith('/uploads/') || url.startsWith('./uploads/') || url.startsWith('uploads/')) {
      // Local files don't need proxying - return indicator to use direct URL
      return res.json({
        success: true,
        isLocal: true,
        message: 'Local file - access directly without proxy'
      });
    }

    // Validate URL - must be a full URL for external resources
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format. Must be a full URL (e.g., https://example.com/image.jpg)',
        input: url
      });
    }
    
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL protocol'
      });
    }

    // Whitelist of allowed domains for security
    const allowedDomains = [
      'oaidalleapiprodscus.blob.core.windows.net', // OpenAI DALL-E
      'dalle-2.s3.amazonaws.com',
      'replicate.delivery', // Replicate
      'pbxt.replicate.delivery',
      'storage.googleapis.com', // Google Cloud Storage
      'lh3.googleusercontent.com',
      'cdn.openai.com',
      'images.unsplash.com',
      'res.cloudinary.com',
      'i.imgur.com',
      'cdn.shopify.com', // Shopify
      'images.pexels.com',
      'cdn.midjourney.com',
      'runway-gen3-output.s3.amazonaws.com', // Runway
    ];

    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      // Log but still try to fetch - some AI services use various CDNs
      logger.warn(`Image proxy request for non-whitelisted domain: ${parsedUrl.hostname}`);
    }

    // Fetch the image
    const imageData = await fetchImage(url);
    
    if (!imageData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch image'
      });
    }

    res.json({
      success: true,
      data: imageData.base64,
      contentType: imageData.contentType
    });

  } catch (error) {
    logger.error('Image proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to proxy image'
    });
  }
});

/**
 * Fetch image from URL and return as base64
 */
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Iqonga-ImageProxy/1.0',
        'Accept': 'image/*'
      },
      timeout: 30000 // 30 second timeout
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchImage(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return resolve(null);
      }

      const contentType = response.headers['content-type'] || 'image/png';
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve({ base64, contentType });
      });
      response.on('error', () => resolve(null));
    });

    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

/**
 * GET endpoint for simple image proxy (returns actual image)
 * Useful for <img> tags that need direct image URLs
 */
router.get('/image', authenticateToken, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Image URL is required'
    });
  }

  try {
    const imageData = await fetchImage(url);
    
    if (!imageData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch image'
      });
    }

    const buffer = Buffer.from(imageData.base64, 'base64');
    res.set('Content-Type', imageData.contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(buffer);

  } catch (error) {
    logger.error('Image proxy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to proxy image'
    });
  }
});

module.exports = router;

