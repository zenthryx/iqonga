const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const UserUploadedImageService = require('../services/UserUploadedImageService');
const ImageManipulationService = require('../services/ImageManipulationService');
const logger = require('../utils/logger');
const sharp = require('sharp');

// Configure multer for user image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/user-images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// POST /api/user-images/upload - Upload user image
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get image metadata
    const metadata = await sharp(req.file.path).metadata();
    
    const fileUrl = `/uploads/user-images/${path.basename(req.file.path)}`;
    
    const imageData = {
      image_name: req.body.image_name || req.file.originalname,
      image_category: req.body.image_category || 'ad_creative',
      description: req.body.description || '',
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
      file_url: fileUrl,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      width: metadata.width,
      height: metadata.height,
      metadata: {
        originalName: req.file.originalname,
        uploadedAt: new Date().toISOString()
      }
    };

    const image = await UserUploadedImageService.addUploadedImage(userId, imageData);
    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to upload user image:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user-images - Get user uploaded images
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, limit, offset } = req.query;

    const images = await UserUploadedImageService.getUserUploadedImages(userId, {
      category,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Failed to get user images:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user-images/:id - Get uploaded image by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const image = await UserUploadedImageService.getUploadedImageById(id, userId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to get user image:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user-images/:id - Update uploaded image
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const image = await UserUploadedImageService.updateUploadedImage(id, userId, updates);
    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to update user image:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/user-images/:id - Delete uploaded image
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await UserUploadedImageService.deleteUploadedImage(id, userId);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete user image:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/user-images/:id/manipulate - Apply image manipulations
router.post('/:id/manipulate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { manipulations } = req.body;

    // Get original image
    const originalImage = await UserUploadedImageService.getUploadedImageById(id, userId);
    if (!originalImage) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Apply manipulations
    const resultPath = await ImageManipulationService.applyManipulations(
      originalImage.file_path,
      manipulations
    );

    // Get result metadata
    const resultMetadata = await ImageManipulationService.getImageMetadata(resultPath);
    const resultFileUrl = `/uploads/user-images/${path.basename(resultPath)}`;

    // Save as new edited image
    const editedImageData = {
      image_name: `${originalImage.image_name} (edited)`,
      image_category: originalImage.image_category,
      description: originalImage.description,
      tags: originalImage.tags,
      file_url: resultFileUrl,
      file_path: resultPath,
      file_type: originalImage.file_type,
      file_size: resultMetadata.size,
      width: resultMetadata.width,
      height: resultMetadata.height,
      original_image_id: id,
      is_edited: true,
      edit_history: [...(originalImage.edit_history || []), { manipulations, timestamp: new Date().toISOString() }],
      metadata: { ...originalImage.metadata, manipulations }
    };

    const editedImage = await UserUploadedImageService.addUploadedImage(userId, editedImageData);

    // Save manipulation history
    await ImageManipulationService.saveManipulationHistory(
      id,
      'user_uploaded',
      userId,
      'batch',
      { manipulations },
      editedImage.id
    );

    res.json({ success: true, data: editedImage });
  } catch (error) {
    logger.error('Failed to manipulate image:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user-images/:id/metadata - Get image metadata
router.get('/:id/metadata', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const image = await UserUploadedImageService.getUploadedImageById(id, userId);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const metadata = await ImageManipulationService.getImageMetadata(image.file_path);
    res.json({ success: true, data: metadata });
  } catch (error) {
    logger.error('Failed to get image metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

