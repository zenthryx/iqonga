const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage for media uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type
    let dest = uploadsDir;
    
    const originalUrl = req.originalUrl || '';
    
    if (originalUrl.includes('/media/upload')) {
      // User media uploads
      if (file.mimetype.startsWith('image/')) {
        dest = path.join(uploadsDir, 'media/images');
      } else if (file.mimetype.startsWith('video/')) {
        dest = path.join(uploadsDir, 'media/videos');
      } else {
        dest = path.join(uploadsDir, 'media/other');
      }
    } else {
      dest = path.join(uploadsDir, 'general');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, extension);
    
    // Create filename: originalname_timestamp_uniquesuffix.extension
    const filename = `${nameWithoutExt}_${timestamp}_${uniqueSuffix}${extension}`;
    
    cb(null, filename);
  }
});

// File filter function - allow images and videos
const fileFilter = function (req, file, cb) {
  // Check file type
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // AVI
    'video/webm',
    'video/ogg'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
};

// Create multer instance for media uploads
const mediaUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file (10 files = 500MB max)
    files: 10 // Allow up to 10 files per request (for character images)
  }
});

// Create multer instance for single file uploads
const singleMediaUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  }
});

// Error handling middleware
const handleMediaUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        details: 'File size must be less than 100MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        details: 'Maximum 5 files allowed per request'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      details: error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      details: error.message
    });
  }
  
  // Pass other errors to next middleware
  next(error);
};

module.exports = {
  mediaUpload,
  singleMediaUpload,
  handleMediaUploadError
};

