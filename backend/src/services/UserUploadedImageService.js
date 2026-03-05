const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Optional dependency - sharp is only needed for image manipulation features
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  logger.warn('sharp module not available - image manipulation features will be limited');
  sharp = null;
}

/**
 * User Uploaded Image Service
 * Manages user-uploaded images for ad creation and manipulation
 */
class UserUploadedImageService {
  /**
   * Add uploaded image
   */
  async addUploadedImage(userId, imageData) {
    try {
      const imageId = uuidv4();
      const {
        image_name,
        image_category = 'ad_creative',
        description,
        tags,
        file_url,
        file_path,
        file_type,
        file_size,
        width,
        height,
        original_image_id,
        is_edited = false,
        edit_history,
        metadata
      } = imageData;

      await database.query(`
        INSERT INTO user_uploaded_images (
          id, user_id, image_name, image_category, description, tags,
          file_url, file_path, file_type, file_size, width, height,
          original_image_id, is_edited, edit_history, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      `, [
        imageId, userId, image_name, image_category, description, tags || [],
        file_url, file_path, file_type, file_size, width, height,
        original_image_id, is_edited,
        edit_history ? JSON.stringify(edit_history) : '[]',
        metadata ? JSON.stringify(metadata) : '{}'
      ]);

      const result = await database.query('SELECT * FROM user_uploaded_images WHERE id = $1', [imageId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add uploaded image:', error);
      throw error;
    }
  }

  /**
   * Get user uploaded images
   */
  async getUserUploadedImages(userId, options = {}) {
    try {
      const { category, limit = 50, offset = 0 } = options;

      let query = `
        SELECT * FROM user_uploaded_images 
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramIndex = 2;

      if (category) {
        query += ` AND image_category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user uploaded images:', error);
      throw error;
    }
  }

  /**
   * Get uploaded image by ID
   */
  async getUploadedImageById(imageId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM user_uploaded_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get uploaded image:', error);
      return null;
    }
  }

  /**
   * Delete uploaded image
   */
  async deleteUploadedImage(imageId, userId) {
    try {
      // Get image to delete file
      const imageResult = await database.query(`
        SELECT file_path FROM user_uploaded_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);

      if (imageResult.rows.length === 0) {
        throw new Error('Image not found');
      }

      const image = imageResult.rows[0];

      // Delete from database
      await database.query(`
        DELETE FROM user_uploaded_images 
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);

      // Delete file if exists
      if (image.file_path) {
        try {
          await fs.unlink(image.file_path);
        } catch (fileError) {
          logger.warn(`Failed to delete uploaded image file: ${image.file_path}`, fileError);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete uploaded image:', error);
      throw error;
    }
  }

  /**
   * Update uploaded image
   */
  async updateUploadedImage(imageId, userId, updates) {
    try {
      const allowedFields = [
        'image_name', 'image_category', 'description', 'tags', 'metadata'
      ];

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(imageId, userId);

      const query = `
        UPDATE user_uploaded_images 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await database.query(query, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Uploaded image not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update uploaded image:', error);
      throw error;
    }
  }

  /**
   * Track image usage
   */
  async trackImageUsage(imageId, userId) {
    try {
      await database.query(`
        UPDATE user_uploaded_images 
        SET times_used = times_used + 1, last_used_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [imageId, userId]);
    } catch (error) {
      logger.error('Failed to track image usage:', error);
    }
  }
}

module.exports = new UserUploadedImageService();

