const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const ProductImageService = require('../services/ProductImageService');
const logger = require('../utils/logger');
const sharp = require('sharp');

// Configure multer for product image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/product-images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
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

// POST /api/product-images/:productId - Upload product image
router.post('/:productId', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get image metadata
    const metadata = await sharp(req.file.path).metadata();
    
    const fileUrl = `/uploads/product-images/${path.basename(req.file.path)}`;
    
    const imageData = {
      image_name: req.body.image_name || req.file.originalname,
      image_type: req.body.image_type || 'product',
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
      sort_order: parseInt(req.body.sort_order) || 0,
      file_url: fileUrl,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      width: metadata.width,
      height: metadata.height,
      alt_text: req.body.alt_text || '',
      caption: req.body.caption || '',
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
      metadata: {}
    };

    const image = await ProductImageService.addProductImage(productId, userId, imageData);
    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to upload product image:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/product-images/:productId - Get product images
router.get('/:productId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const images = await ProductImageService.getProductImages(productId, userId);
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Failed to get product images:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/product-images/user/all - Get all user product images
router.get('/user/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const images = await ProductImageService.getUserProductImages(userId);
    res.json({ success: true, data: images });
  } catch (error) {
    logger.error('Failed to get user product images:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/product-images/:imageId - Update product image
router.put('/:imageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageId } = req.params;
    const updates = req.body;

    const image = await ProductImageService.updateProductImage(imageId, userId, updates);
    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to update product image:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/product-images/:imageId - Delete product image
router.delete('/:imageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageId } = req.params;

    await ProductImageService.deleteProductImage(imageId, userId);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete product image:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/product-images/:productId/primary - Get primary product image
router.get('/:productId/primary', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const image = await ProductImageService.getPrimaryProductImage(productId);
    
    if (!image) {
      return res.status(404).json({ error: 'No primary image found' });
    }

    res.json({ success: true, data: image });
  } catch (error) {
    logger.error('Failed to get primary product image:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

