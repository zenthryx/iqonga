const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireTokenAccess } = require('../middleware/requireTokenAccess');
const CharacterService = require('../services/CharacterService');
const AvatarProcessingService = require('../services/AvatarProcessingService');
const { singleMediaUpload, mediaUpload } = require('../middleware/mediaUpload');
const logger = require('../utils/logger');
const CreditService = require('../services/CreditService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const creditService = new CreditService();

// Configure multer for video uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars/videos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `avatar-video-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video file type. Allowed: mp4, mov, webm'));
    }
  }
});

// POST /api/characters - Create a new character
router.post('/', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      creationMethod = 'images', // 'images', 'single_image', 'description'
      imageUrls = [],
      tags = [],
      visibility = 'private', // 'private' or 'public'
      metadata = {}
    } = req.body;

    // Deduct credits for character creation (50 credits)
    const characterId = uuidv4();
    const creditCost = 50;
    
    try {
      await creditService.deductCredits(userId, 'character_creation', creditCost, characterId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const character = await CharacterService.createCharacter(userId, {
      name,
      description,
      creationMethod,
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      visibility,
      metadata
    });

    res.json({
      success: true,
      data: character,
      message: 'Character created successfully'
    });
  } catch (error) {
    logger.error('Character creation failed:', error);
    res.status(500).json({
      error: 'Failed to create character',
      details: error.message
    });
  }
});

// POST /api/characters/upload-images - Upload images for character creation
router.post('/upload-images', authenticateToken, requireTokenAccess, mediaUpload.array('images', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    // Check file sizes (client-side validation should catch this, but double-check)
    const maxFileSize = 50 * 1024 * 1024; // 50MB per file
    const oversizedFiles = req.files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      return res.status(400).json({
        error: 'File too large',
        details: `One or more files exceed the 50MB limit. Please compress your images.`
      });
    }

    // Deduct credits for image uploads (10 credits per image)
    const creditCost = 10 * req.files.length;
    const uploadId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'character_image_upload', creditCost, uploadId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Process uploaded images
    const imageUrls = req.files.map(file => {
      // Generate URL relative to uploads directory
      const relativePath = file.path.replace(/\\/g, '/');
      const uploadsIndex = relativePath.indexOf('uploads/');
      if (uploadsIndex !== -1) {
        return `/${relativePath.substring(uploadsIndex)}`;
      }
      return `/uploads/${file.filename}`;
    });

    res.json({
      success: true,
      data: {
        imageUrls,
        count: imageUrls.length
      },
      message: `${imageUrls.length} image(s) uploaded successfully`
    });
  } catch (error) {
    logger.error('Image upload failed:', error);
    
    // Handle 413 errors from nginx
    if (error.message && (error.message.includes('413') || error.message.includes('Request Entity Too Large'))) {
      return res.status(413).json({
        error: 'File too large',
        details: 'The uploaded file(s) exceed the server limit. Please compress your images or contact support. Maximum file size: 50MB per file. Note: Nginx must be configured with client_max_body_size 100m or higher.'
      });
    }
    
    res.status(500).json({
      error: 'Failed to upload images',
      details: error.message
    });
  }
});

// GET /api/characters - Get user's characters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status = 'active',
      visibility = null,
      search = null
    } = req.query;

    const result = await CharacterService.getUserCharacters(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      visibility,
      search
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to fetch characters:', error);
    res.status(500).json({
      error: 'Failed to fetch characters',
      details: error.message
    });
  }
});

// GET /api/characters/community - Get community/public characters
router.get('/community', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = null
    } = req.query;

    const result = await CharacterService.getCommunityCharacters({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to fetch community characters:', error);
    res.status(500).json({
      error: 'Failed to fetch community characters',
      details: error.message
    });
  }
});

// GET /api/characters/:id - Get a single character
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const character = await CharacterService.getCharacterById(id, userId);

    res.json({
      success: true,
      data: character
    });
  } catch (error) {
    logger.error('Failed to fetch character:', error);
    res.status(404).json({
      error: 'Character not found',
      details: error.message
    });
  }
});

// PUT /api/characters/:id - Update a character
router.put('/:id', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const character = await CharacterService.updateCharacter(id, userId, updates);

    res.json({
      success: true,
      data: character,
      message: 'Character updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update character:', error);
    res.status(500).json({
      error: 'Failed to update character',
      details: error.message
    });
  }
});

// DELETE /api/characters/:id - Delete a character
router.delete('/:id', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await CharacterService.deleteCharacter(id, userId);

    res.json({
      success: true,
      data: result,
      message: 'Character deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete character:', error);
    res.status(500).json({
      error: 'Failed to delete character',
      details: error.message
    });
  }
});

// ==================== NEW AVATAR ENDPOINTS ====================

// POST /api/characters/upload-video - Upload video for avatar creation
router.post('/upload-video', authenticateToken, requireTokenAccess, videoUpload.single('video'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    // Check file size (10GB max)
    const maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (req.file.size > maxFileSize) {
      return res.status(400).json({
        error: 'File too large',
        details: `Video file exceeds the 10GB limit. Please compress your video.`
      });
    }

    // Deduct credits for video upload (50 credits)
    const creditCost = 50;
    const uploadId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'avatar_video_upload', creditCost, uploadId);
    } catch (creditError) {
      // Delete uploaded file if credit deduction fails
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    // Generate URL relative to uploads directory
    const relativePath = req.file.path.replace(/\\/g, '/');
    const uploadsIndex = relativePath.indexOf('uploads/');
    const videoUrl = uploadsIndex !== -1 
      ? `/${relativePath.substring(uploadsIndex)}`
      : `/uploads/avatars/videos/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    logger.error('Video upload failed:', error);
    
    // Handle 413 errors from nginx
    if (error.message && (error.message.includes('413') || error.message.includes('Request Entity Too Large'))) {
      return res.status(413).json({
        error: 'File too large',
        details: 'The uploaded file exceeds the server limit. Maximum file size: 10GB.'
      });
    }
    
    res.status(500).json({
      error: 'Failed to upload video',
      details: error.message
    });
  }
});

// POST /api/characters/create-from-video - Create avatar from video
router.post('/create-from-video', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      videoUrl,
      description,
      tags = [],
      visibility = 'private',
      uploadMethod = 'file_upload',
      uploadSource = null
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Avatar name is required'
      });
    }

    if (!videoUrl) {
      return res.status(400).json({
        error: 'Video URL is required'
      });
    }

    // Deduct credits for video-based avatar creation (200 credits)
    const creditCost = 200;
    const characterId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'avatar_creation_video', creditCost, characterId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const avatar = await CharacterService.createAvatarFromVideo(userId, {
      name,
      videoUrl,
      description,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      visibility,
      uploadMethod,
      uploadSource
    });

    res.json({
      success: true,
      data: avatar,
      message: 'Avatar creation started. Processing in background...'
    });
  } catch (error) {
    logger.error('Avatar creation from video failed:', error);
    res.status(500).json({
      error: 'Failed to create avatar from video',
      details: error.message
    });
  }
});

// POST /api/characters/create-from-photos - Create avatar from photos
router.post('/create-from-photos', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      photoUrls = [],
      description,
      tags = [],
      visibility = 'private'
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Avatar name is required'
      });
    }

    if (!photoUrls || photoUrls.length === 0) {
      return res.status(400).json({
        error: 'At least one photo is required'
      });
    }

    if (photoUrls.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 photos allowed'
      });
    }

    // Deduct credits for photo-based avatar creation (100 credits)
    const creditCost = 100;
    const characterId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'avatar_creation_photo', creditCost, characterId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const avatar = await CharacterService.createAvatarFromPhotos(userId, {
      name,
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [photoUrls],
      description,
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      visibility
    });

    res.json({
      success: true,
      data: avatar,
      message: 'Avatar creation started. Processing in background...'
    });
  } catch (error) {
    logger.error('Avatar creation from photos failed:', error);
    res.status(500).json({
      error: 'Failed to create avatar from photos',
      details: error.message
    });
  }
});

// GET /api/characters/:id/processing-status - Get avatar processing status
router.get('/:id/processing-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const status = await CharacterService.getProcessingStatus(id, userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get processing status:', error);
    res.status(500).json({
      error: 'Failed to get processing status',
      details: error.message
    });
  }
});

// GET /api/characters/:id/looks - Get all looks for an avatar
router.get('/:id/looks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const looks = await CharacterService.getAvatarLooks(id, userId);

    res.json({
      success: true,
      data: looks
    });
  } catch (error) {
    logger.error('Failed to get avatar looks:', error);
    res.status(500).json({
      error: 'Failed to get avatar looks',
      details: error.message
    });
  }
});

// POST /api/characters/:id/looks - Add new look to avatar
router.post('/:id/looks', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      description,
      look_type = 'photo',
      image_url,
      video_url,
      thumbnail_url,
      outfit_type,
      setting,
      pose,
      expression,
      is_default = false,
      order_index = 0,
      metadata = {}
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Look name is required'
      });
    }

    // Deduct credits for adding a look (50 credits)
    const creditCost = 50;
    const lookId = uuidv4();
    
    try {
      await creditService.deductCredits(userId, 'avatar_look_creation', creditCost, lookId);
    } catch (creditError) {
      return res.status(402).json({
        error: 'Insufficient credits',
        details: creditError.message,
        requiredCredits: creditCost
      });
    }

    const look = await AvatarProcessingService.createLook(id, userId, {
      name,
      description,
      look_type,
      image_url,
      video_url,
      thumbnail_url,
      outfit_type,
      setting,
      pose,
      expression,
      is_default,
      order_index,
      metadata
    });

    res.json({
      success: true,
      data: look,
      message: 'Look created successfully'
    });
  } catch (error) {
    logger.error('Failed to create look:', error);
    res.status(500).json({
      error: 'Failed to create look',
      details: error.message
    });
  }
});

// PUT /api/characters/:id/looks/:lookId - Update a look
router.put('/:id/looks/:lookId', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, lookId } = req.params;
    const updates = req.body;

    // Verify ownership
    const character = await CharacterService.getCharacterById(id, userId);
    if (!character) {
      return res.status(404).json({
        error: 'Avatar not found'
      });
    }

    // Update look
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(updates.name.trim());
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.image_url !== undefined) {
      updateFields.push(`image_url = $${paramIndex++}`);
      params.push(updates.image_url);
    }

    if (updates.video_url !== undefined) {
      updateFields.push(`video_url = $${paramIndex++}`);
      params.push(updates.video_url);
    }

    if (updates.thumbnail_url !== undefined) {
      updateFields.push(`thumbnail_url = $${paramIndex++}`);
      params.push(updates.thumbnail_url);
    }

    if (updates.outfit_type !== undefined) {
      updateFields.push(`outfit_type = $${paramIndex++}`);
      params.push(updates.outfit_type);
    }

    if (updates.setting !== undefined) {
      updateFields.push(`setting = $${paramIndex++}`);
      params.push(updates.setting);
    }

    if (updates.pose !== undefined) {
      updateFields.push(`pose = $${paramIndex++}`);
      params.push(updates.pose);
    }

    if (updates.expression !== undefined) {
      updateFields.push(`expression = $${paramIndex++}`);
      params.push(updates.expression);
    }

    if (updates.is_default !== undefined) {
      // If setting as default, unset other defaults
      if (updates.is_default) {
        await database.query(`
          UPDATE avatar_looks
          SET is_default = false
          WHERE character_id = $1 AND id != $2
        `, [id, lookId]);
      }
      updateFields.push(`is_default = $${paramIndex++}`);
      params.push(updates.is_default);
    }

    if (updates.order_index !== undefined) {
      updateFields.push(`order_index = $${paramIndex++}`);
      params.push(updates.order_index);
    }

    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(updates.metadata));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(lookId, id, userId);

    const result = await database.query(`
      UPDATE avatar_looks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND character_id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Look not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        metadata: typeof result.rows[0].metadata === 'string' 
          ? JSON.parse(result.rows[0].metadata) 
          : result.rows[0].metadata
      },
      message: 'Look updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update look:', error);
    res.status(500).json({
      error: 'Failed to update look',
      details: error.message
    });
  }
});

// DELETE /api/characters/:id/looks/:lookId - Delete a look
router.delete('/:id/looks/:lookId', authenticateToken, requireTokenAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, lookId } = req.params;

    // Verify ownership
    const character = await CharacterService.getCharacterById(id, userId);
    if (!character) {
      return res.status(404).json({
        error: 'Avatar not found'
      });
    }

    // Soft delete (set is_active = false)
    const result = await database.query(`
      UPDATE avatar_looks
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND character_id = $2 AND user_id = $3
      RETURNING id
    `, [lookId, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Look not found'
      });
    }

    // Update looks count
    await database.query(`
      UPDATE characters
      SET looks_count = (
        SELECT COUNT(*) FROM avatar_looks
        WHERE character_id = $1 AND is_active = true
      )
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Look deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete look:', error);
    res.status(500).json({
      error: 'Failed to delete look',
      details: error.message
    });
  }
});

module.exports = router;

