const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const { singleMediaUpload, mediaUpload, handleMediaUploadError } = require('../middleware/mediaUpload');
const MediaService = require('../services/MediaService');
const logger = require('../utils/logger');
const CreditService = require('../services/CreditService');
const database = require('../database/connection');

const creditService = new CreditService();

// POST /api/media/upload - Upload single media file
router.post('/upload', authenticateToken, requireTokenAccess, singleMediaUpload.single('file'), handleMediaUploadError, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      agent_id,
      description,
      tags,
      is_public = false
    } = req.body;

    // Parse tags if provided as string
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    // Deduct credits for media upload (10 credits per file)
    const mediaId = require('uuid').v4();
    const creditCost = 10;
    
    try {
      await creditService.deductCredits(userId, 'media_upload', creditCost, mediaId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Save media to database
    const media = await MediaService.saveMedia(userId, req.file, {
      agentId: agent_id || null,
      description: description || null,
      tags: tagsArray,
      isPublic: is_public === 'true' || is_public === true
    });

    res.json({
      success: true,
      data: media,
      message: 'Media uploaded successfully'
    });

  } catch (error) {
    logger.error('Media upload failed:', error);
    res.status(500).json({
      error: 'Failed to upload media',
      details: error.message
    });
  }
});

// POST /api/media/upload-multiple - Upload multiple media files
router.post('/upload-multiple', authenticateToken, requireTokenAccess, mediaUpload.array('files', 5), handleMediaUploadError, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const {
      agent_id,
      description,
      tags,
      is_public = false
    } = req.body;

    // Parse tags if provided
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    // Deduct credits (10 credits per file)
    const creditCost = 10 * req.files.length;
    const uploadId = require('uuid').v4();
    
    try {
      await creditService.deductCredits(userId, 'media_upload', creditCost, uploadId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Save all media files
    const uploadedMedia = [];
    for (const file of req.files) {
      const media = await MediaService.saveMedia(userId, file, {
        agentId: agent_id || null,
        description: description || null,
        tags: tagsArray,
        isPublic: is_public === 'true' || is_public === true
      });
      uploadedMedia.push(media);
    }

    res.json({
      success: true,
      data: uploadedMedia,
      count: uploadedMedia.length,
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`
    });

  } catch (error) {
    logger.error('Multiple media upload failed:', error);
    res.status(500).json({
      error: 'Failed to upload media',
      details: error.message
    });
  }
});

// POST /api/media/import-url - Import media from URL (e.g., from Canva export)
router.post('/import-url', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, name, description, tags, agent_id, is_public = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Deduct credits (10 credits per import)
    const creditCost = 10;
    const importId = require('uuid').v4();
    
    try {
      await creditService.deductCredits(userId, 'media_import', creditCost, importId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Download file from URL
    const axios = require('axios');
    const path = require('path');
    const fs = require('fs').promises;
    const { v4: uuidv4 } = require('uuid');
    const sharp = require('sharp');

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Determine file type from URL or content
    const urlPath = new URL(url).pathname;
    let ext = path.extname(urlPath).toLowerCase();
    if (!ext || ext.length > 5) {
      // Try to determine from content type
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('image')) {
        ext = '.jpg';
      } else if (contentType.includes('video')) {
        ext = '.mp4';
      } else {
        ext = '.jpg'; // Default
      }
    }

    // Create uploads directory structure
    const uploadsDir = path.join(__dirname, '../../uploads/media');
    const userDir = path.join(uploadsDir, userId.toString());
    await fs.mkdir(userDir, { recursive: true });

    // Generate filename
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(userDir, filename);

    // Save file
    await fs.writeFile(filepath, Buffer.from(response.data));

    // Get file stats
    const stats = await fs.stat(filepath);
    const fileSize = stats.size;

    // Determine MIME type
    let mimeType = response.headers['content-type'] || 'application/octet-stream';
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
    }

    // Get image dimensions if it's an image
    let width = null;
    let height = null;
    if (mimeType.startsWith('image/')) {
      try {
        const metadata = await sharp(filepath).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (sharpError) {
        logger.warn('Failed to get image metadata:', sharpError);
      }
    }

    // Parse tags
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }
    // Add canva tag
    if (!tagsArray.includes('canva')) {
      tagsArray.push('canva');
    }

    // Save to database
    const mediaId = uuidv4();
    const fileUrl = `/uploads/media/${userId}/${filename}`;
    const fileType = mimeType.startsWith('image/') ? 'image' : 'video';

    const result = await database.query(`
      INSERT INTO uploaded_media (
        id, user_id, agent_id, file_name, original_name, file_path, file_url,
        file_type, mime_type, file_size, width, height, description, tags, is_public, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active')
      RETURNING *
    `, [
      mediaId,
      userId,
      agent_id || null,
      filename,
      name || filename,
      filepath,
      fileUrl,
      fileType,
      mimeType,
      fileSize,
      width,
      height,
      description || `Imported from Canva`,
      tagsArray,
      is_public === 'true' || is_public === true
    ]);

    logger.info(`Media imported from URL: ${mediaId} - ${name || filename}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Media imported successfully'
    });

  } catch (error) {
    logger.error('Media import from URL failed:', error);
    res.status(500).json({
      error: 'Failed to import media from URL',
      details: error.message
    });
  }
});

// GET /api/media - Get user's media library
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      file_type,
      agent_id,
      limit = 50,
      offset = 0,
      search,
      tags
    } = req.query;

    // Parse tags if provided
    let tagsArray = null;
    if (tags) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    const media = await MediaService.getUserMedia(userId, {
      fileType: file_type || null,
      agentId: agent_id || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      search: search || null,
      tags: tagsArray
    });

    res.json({
      success: true,
      data: media,
      count: media.length
    });

  } catch (error) {
    logger.error('Failed to get media library:', error);
    res.status(500).json({
      error: 'Failed to get media library',
      details: error.message
    });
  }
});

// GET /api/media/stats - Get media statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await MediaService.getMediaStats(userId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get media stats:', error);
    res.status(500).json({
      error: 'Failed to get media statistics',
      details: error.message
    });
  }
});

// GET /api/media/:id - Get specific media file
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const media = await MediaService.getMediaById(id, userId);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({
      success: true,
      data: media
    });

  } catch (error) {
    logger.error('Failed to get media:', error);
    res.status(500).json({
      error: 'Failed to get media',
      details: error.message
    });
  }
});

// PUT /api/media/:id - Update media metadata
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      description,
      tags,
      is_public
    } = req.body;

    // Parse tags if provided
    let tagsArray = null;
    if (tags !== undefined) {
      tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
    }

    const media = await MediaService.updateMedia(id, userId, {
      description,
      tags: tagsArray,
      isPublic: is_public !== undefined ? (is_public === 'true' || is_public === true) : null
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({
      success: true,
      data: media,
      message: 'Media updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update media:', error);
    res.status(500).json({
      error: 'Failed to update media',
      details: error.message
    });
  }
});

// DELETE /api/media/:id - Delete media
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const media = await MediaService.deleteMedia(id, userId);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete media:', error);
    res.status(500).json({
      error: 'Failed to delete media',
      details: error.message
    });
  }
});

module.exports = router;

