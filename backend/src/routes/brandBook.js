const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const BrandBookService = require('../services/BrandBookService');
const logger = require('../utils/logger');

// Optional dependency - sharp is only needed for image processing features
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  logger.warn('sharp module not available - image processing features will be limited');
  sharp = null;
}

// Configure multer for brand asset uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/brand-assets');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'brand-asset-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

// GET /api/brand-book - Get or create default brand book
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandBook = await BrandBookService.getOrCreateBrandBook(userId);
    res.json({ success: true, data: brandBook });
  } catch (error) {
    logger.error('Failed to get brand book:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/brand-book/all - Get all brand books for user
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const brandBooks = await BrandBookService.getUserBrandBooks(userId);
    res.json({ success: true, data: brandBooks });
  } catch (error) {
    logger.error('Failed to get brand books:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/brand-book/:id - Get brand book by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const brandBook = await BrandBookService.getBrandBookById(id, userId);
    
    if (!brandBook) {
      return res.status(404).json({ error: 'Brand book not found' });
    }

    res.json({ success: true, data: brandBook });
  } catch (error) {
    logger.error('Failed to get brand book:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/brand-book/:id - Update brand book
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const brandBook = await BrandBookService.updateBrandBook(id, userId, updates);
    res.json({ success: true, data: brandBook });
  } catch (error) {
    logger.error('Failed to update brand book:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/brand-book/:id/assets - Add brand asset
router.post('/:id/assets', authenticateToken, upload.single('asset'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get image metadata
    const metadata = await sharp(req.file.path).metadata();
    
    const fileUrl = `/uploads/brand-assets/${path.basename(req.file.path)}`;
    
    const assetData = {
      asset_name: req.body.asset_name || req.file.originalname,
      asset_type: req.body.asset_type || 'image',
      asset_category: req.body.asset_category || 'other',
      description: req.body.description || '',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      file_url: fileUrl,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      width: metadata.width,
      height: metadata.height,
      usage_guidelines: req.body.usage_guidelines || '',
      restrictions: req.body.restrictions || '',
      metadata: {}
    };

    const asset = await BrandBookService.addBrandAsset(id, userId, assetData);
    res.json({ success: true, data: asset });
  } catch (error) {
    logger.error('Failed to add brand asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/brand-book/assets/:assetId - Delete brand asset
router.delete('/assets/:assetId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { assetId } = req.params;
    
    await BrandBookService.deleteBrandAsset(assetId, userId);
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete brand asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/brand-book/guidelines/ai - Get brand guidelines for AI generation
router.get('/guidelines/ai', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const guidelines = await BrandBookService.getBrandGuidelinesForAI(userId);
    res.json({ success: true, data: guidelines });
  } catch (error) {
    logger.error('Failed to get brand guidelines:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

