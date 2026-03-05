const database = require('../database/connection');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class MediaService {
  /**
   * Save uploaded media to database
   */
  async saveMedia(userId, file, options = {}) {
    try {
      const {
        agentId = null,
        description = null,
        tags = [],
        isPublic = false
      } = options;

      // Determine file type
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // Generate file URL (relative to uploads directory)
      const fileUrl = `/uploads/${file.path.replace(/\\/g, '/').split('uploads/')[1]}`;
      
      // Get file dimensions if it's an image (would need image processing library)
      // For now, we'll leave width/height as null and can add later
      
      const mediaId = uuidv4();
      
      // Save to database
      const result = await database.query(`
        INSERT INTO uploaded_media (
          id, user_id, agent_id, file_name, original_name, file_path, file_url,
          file_type, mime_type, file_size, description, tags, is_public, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
        RETURNING *
      `, [
        mediaId,
        userId,
        agentId,
        file.filename,
        file.originalname,
        file.path,
        fileUrl,
        fileType,
        file.mimetype,
        file.size,
        description,
        tags,
        isPublic
      ]);

      logger.info(`Media saved: ${mediaId} - ${file.originalname}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error saving media to database:', error);
      throw error;
    }
  }

  /**
   * Get user's media library
   */
  async getUserMedia(userId, options = {}) {
    try {
      const {
        fileType = null, // 'image' or 'video'
        agentId = null,
        limit = 50,
        offset = 0,
        search = null,
        tags = null
      } = options;

      let query = `
        SELECT 
          id, file_name, original_name, file_url, file_type, mime_type,
          file_size, width, height, duration, thumbnail_url, description,
          tags, is_public, status, created_at, updated_at
        FROM uploaded_media
        WHERE user_id = $1 AND status = 'active'
      `;
      
      const params = [userId];
      let paramIndex = 2;

      if (fileType) {
        query += ` AND file_type = $${paramIndex}`;
        params.push(fileType);
        paramIndex++;
      }

      if (agentId) {
        query += ` AND agent_id = $${paramIndex}`;
        params.push(agentId);
        paramIndex++;
      }

      if (search) {
        query += ` AND (original_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (tags && Array.isArray(tags) && tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        params.push(tags);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user media:', error);
      throw error;
    }
  }

  /**
   * Get media by ID
   */
  async getMediaById(mediaId, userId) {
    try {
      const result = await database.query(`
        SELECT 
          id, file_name, original_name, file_url, file_type, mime_type,
          file_size, width, height, duration, thumbnail_url, description,
          tags, is_public, status, created_at, updated_at
        FROM uploaded_media
        WHERE id = $1 AND user_id = $2 AND status = 'active'
      `, [mediaId, userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting media by ID:', error);
      throw error;
    }
  }

  /**
   * Update media metadata
   */
  async updateMedia(mediaId, userId, updates) {
    try {
      const {
        description = null,
        tags = null,
        isPublic = null
      } = updates;

      const updateFields = [];
      const params = [mediaId, userId];
      let paramIndex = 3;

      if (description !== null) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(description);
        paramIndex++;
      }

      if (tags !== null) {
        updateFields.push(`tags = $${paramIndex}`);
        params.push(Array.isArray(tags) ? tags : [tags]);
        paramIndex++;
      }

      if (isPublic !== null) {
        updateFields.push(`is_public = $${paramIndex}`);
        params.push(isPublic);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE uploaded_media
        SET ${updateFields.join(', ')}
        WHERE id = $1 AND user_id = $2 AND status = 'active'
        RETURNING *
      `;

      const result = await database.query(query, params);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating media:', error);
      throw error;
    }
  }

  /**
   * Delete media (soft delete)
   */
  async deleteMedia(mediaId, userId) {
    try {
      // Get media info first to delete file
      const media = await this.getMediaById(mediaId, userId);
      
      if (!media) {
        throw new Error('Media not found');
      }

      // Soft delete - mark as deleted
      const result = await database.query(`
        UPDATE uploaded_media
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [mediaId, userId]);

      // Optionally delete the physical file
      try {
        if (fs.existsSync(media.file_path)) {
          fs.unlinkSync(media.file_path);
          logger.info(`Deleted file: ${media.file_path}`);
        }
      } catch (fileError) {
        logger.warn(`Failed to delete file ${media.file_path}:`, fileError);
        // Continue even if file deletion fails
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Get media statistics for user
   */
  async getMediaStats(userId) {
    try {
      const result = await database.query(`
        SELECT 
          file_type,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM uploaded_media
        WHERE user_id = $1 AND status = 'active'
        GROUP BY file_type
      `, [userId]);

      const stats = {
        total: 0,
        images: 0,
        videos: 0,
        totalSize: 0
      };

      result.rows.forEach(row => {
        stats.total += parseInt(row.count);
        stats.totalSize += parseInt(row.total_size || 0);
        
        if (row.file_type === 'image') {
          stats.images = parseInt(row.count);
        } else if (row.file_type === 'video') {
          stats.videos = parseInt(row.count);
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting media stats:', error);
      throw error;
    }
  }
}

module.exports = new MediaService();

