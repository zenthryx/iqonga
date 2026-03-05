const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const AvatarProcessingService = require('./AvatarProcessingService');

class CharacterService {
  /**
   * Create a new character
   * @param {number} userId - User ID
   * @param {Object} characterData - Character data
   * @param {string} characterData.name - Character name
   * @param {string} characterData.description - Character description
   * @param {string} characterData.creationMethod - 'images', 'single_image', 'description'
   * @param {string[]} characterData.imageUrls - Array of image URLs
   * @param {string[]} characterData.tags - Array of tags
   * @param {string} characterData.visibility - 'private' or 'public'
   * @param {Object} characterData.metadata - Additional metadata
   */
  async createCharacter(userId, characterData) {
    try {
      const {
        name,
        description = null,
        creationMethod = 'images',
        imageUrls = [],
        tags = [],
        visibility = 'private',
        metadata = {}
      } = characterData;

      if (!name || name.trim() === '') {
        throw new Error('Character name is required');
      }

      if (imageUrls.length === 0 && creationMethod !== 'description') {
        throw new Error('At least one image is required for character creation');
      }

      // Set preview image (first image or null)
      const previewImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      const characterId = uuidv4();

      // Map creationMethod to avatar_type for backward compatibility
      let avatarType = 'images';
      if (creationMethod === 'description' || creationMethod === 'ai_generated') {
        avatarType = 'ai_generated';
      } else if (creationMethod === 'single_image' || creationMethod === 'images') {
        avatarType = 'images'; // Legacy photo-based
      }

      // Save to database
      const result = await database.query(`
        INSERT INTO characters (
          id, user_id, name, description, creation_method,
          image_urls, preview_image_url, metadata, tags, visibility, status,
          avatar_type, processing_status, processing_progress
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, 'completed', 100)
        RETURNING *
      `, [
        characterId,
        userId,
        name.trim(),
        description,
        creationMethod,
        imageUrls,
        previewImageUrl,
        JSON.stringify(metadata),
        tags,
        visibility,
        avatarType
      ]);

      logger.info(`Character created: ${characterId} - ${name} by user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating character:', error);
      throw error;
    }
  }

  /**
   * Get user's characters
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.status - Filter by status
   * @param {string} options.visibility - Filter by visibility
   * @param {string} options.search - Search by name or description
   */
  async getUserCharacters(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        visibility = null,
        search = null
      } = options;

      const offset = (page - 1) * limit;
      const params = [userId];
      let paramIndex = 1;

      let query = `
        SELECT 
          id, name, description, creation_method, image_urls,
          preview_image_url, metadata, tags, visibility, status,
          created_at, updated_at
        FROM characters
        WHERE user_id = $1
      `;

      // Add status filter
      if (status) {
        paramIndex++;
        query += ` AND status = $${paramIndex}`;
        params.push(status);
      }

      // Add visibility filter
      if (visibility) {
        paramIndex++;
        query += ` AND visibility = $${paramIndex}`;
        params.push(visibility);
      }

      // Add search filter
      if (search && search.trim() !== '') {
        paramIndex++;
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM characters
        WHERE user_id = $1
      `;
      const countParams = [userId];
      let countParamIndex = 1;

      if (status) {
        countParamIndex++;
        countQuery += ` AND status = $${countParamIndex}`;
        countParams.push(status);
      }

      if (visibility) {
        countParamIndex++;
        countQuery += ` AND visibility = $${countParamIndex}`;
        countParams.push(visibility);
      }

      if (search && search.trim() !== '') {
        countParamIndex++;
        countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
        countParams.push(`%${search.trim()}%`);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        characters: result.rows.map(char => ({
          ...char,
          imageUrls: char.image_urls || [],
          previewImageUrl: char.preview_image_url,
          creationMethod: char.creation_method,
          avatarType: char.avatar_type || 'images',
          processingStatus: char.processing_status || 'completed',
          processingProgress: char.processing_progress || 100,
          looksCount: char.looks_count || 1,
          metadata: typeof char.metadata === 'string' ? JSON.parse(char.metadata) : char.metadata
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user characters:', error);
      throw error;
    }
  }

  /**
   * Get a single character by ID
   * @param {string} characterId - Character ID
   * @param {number} userId - User ID (for authorization)
   */
  async getCharacterById(characterId, userId) {
    try {
      const result = await database.query(`
        SELECT 
          id, name, description, creation_method, image_urls,
          preview_image_url, metadata, tags, visibility, status,
          user_id, created_at, updated_at
        FROM characters
        WHERE id = $1 AND status = 'active'
      `, [characterId]);

      if (result.rows.length === 0) {
        throw new Error('Character not found');
      }

      const character = result.rows[0];

      // Check if user has access (owner or public)
      if (character.user_id !== userId && character.visibility !== 'public') {
        throw new Error('Access denied to this character');
      }

      return {
        ...character,
        imageUrls: character.image_urls || [],
        previewImageUrl: character.preview_image_url,
        creationMethod: character.creation_method,
        avatarType: character.avatar_type || 'images',
        processingStatus: character.processing_status || 'completed',
        processingProgress: character.processing_progress || 100,
        looksCount: character.looks_count || 1,
        heygenAvatarId: character.heygen_avatar_id,
        videoUrl: character.video_url,
        metadata: typeof character.metadata === 'string' ? JSON.parse(character.metadata) : character.metadata
      };
    } catch (error) {
      logger.error('Error fetching character:', error);
      throw error;
    }
  }

  /**
   * Update a character
   * @param {string} characterId - Character ID
   * @param {number} userId - User ID
   * @param {Object} updates - Fields to update
   */
  async updateCharacter(characterId, userId, updates) {
    try {
      // Verify ownership
      const character = await this.getCharacterById(characterId, userId);
      if (character.user_id !== userId) {
        throw new Error('Only the character owner can update it');
      }

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

      if (updates.imageUrls !== undefined) {
        updateFields.push(`image_urls = $${paramIndex++}`);
        params.push(updates.imageUrls);
        // Update preview image
        updateFields.push(`preview_image_url = $${paramIndex++}`);
        params.push(updates.imageUrls.length > 0 ? updates.imageUrls[0] : null);
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        params.push(updates.tags);
      }

      if (updates.visibility !== undefined) {
        updateFields.push(`visibility = $${paramIndex++}`);
        params.push(updates.visibility);
      }

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify(updates.metadata));
      }

      if (updateFields.length === 0) {
        return character;
      }

      updateFields.push(`updated_at = NOW()`);
      params.push(characterId, userId);

      const result = await database.query(`
        UPDATE characters
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
        RETURNING *
      `, params);

      logger.info(`Character updated: ${characterId}`);
      return {
        ...result.rows[0],
        imageUrls: result.rows[0].image_urls || [],
        previewImageUrl: result.rows[0].preview_image_url,
        creationMethod: result.rows[0].creation_method,
        metadata: typeof result.rows[0].metadata === 'string' ? JSON.parse(result.rows[0].metadata) : result.rows[0].metadata
      };
    } catch (error) {
      logger.error('Error updating character:', error);
      throw error;
    }
  }

  /**
   * Delete a character (soft delete)
   * @param {string} characterId - Character ID
   * @param {number} userId - User ID
   */
  async deleteCharacter(characterId, userId) {
    try {
      // Verify ownership
      const character = await this.getCharacterById(characterId, userId);
      if (character.user_id !== userId) {
        throw new Error('Only the character owner can delete it');
      }

      const result = await database.query(`
        UPDATE characters
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `, [characterId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Character not found or already deleted');
      }

      logger.info(`Character deleted: ${characterId}`);
      return { success: true, id: characterId };
    } catch (error) {
      logger.error('Error deleting character:', error);
      throw error;
    }
  }

  /**
   * Get community/public characters
   * @param {Object} options - Query options
   */
  async getCommunityCharacters(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = null
      } = options;

      const offset = (page - 1) * limit;
      const params = [];
      let paramIndex = 0;

      let query = `
        SELECT 
          c.id, c.name, c.description, c.creation_method, c.image_urls,
          c.preview_image_url, c.metadata, c.tags, c.created_at, c.updated_at,
          u.username, u.email
        FROM characters c
        JOIN users u ON c.user_id = u.id
        WHERE c.visibility = 'public' AND c.status = 'active'
      `;

      if (search && search.trim() !== '') {
        paramIndex++;
        query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM characters
        WHERE visibility = 'public' AND status = 'active'
      `;
      const countParams = [];

      if (search && search.trim() !== '') {
        countQuery += ` AND (name ILIKE $1 OR description ILIKE $1)`;
        countParams.push(`%${search.trim()}%`);
      }

      const countResult = await database.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        characters: result.rows.map(char => ({
          id: char.id,
          name: char.name,
          description: char.description,
          imageUrls: char.image_urls || [],
          previewImageUrl: char.preview_image_url,
          creationMethod: char.creation_method,
          tags: char.tags || [],
          metadata: typeof char.metadata === 'string' ? JSON.parse(char.metadata) : char.metadata,
          createdBy: {
            username: char.username,
            email: char.email
          },
          createdAt: char.created_at,
          updatedAt: char.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching community characters:', error);
      throw error;
    }
  }

  /**
   * Create avatar from video
   * @param {number} userId - User ID
   * @param {Object} avatarData - Avatar data
   * @param {string} avatarData.name - Avatar name
   * @param {string} avatarData.videoUrl - Video file URL
   * @param {string} avatarData.description - Optional description
   * @param {string[]} avatarData.tags - Optional tags
   * @param {string} avatarData.visibility - 'private' or 'public'
   */
  async createAvatarFromVideo(userId, avatarData) {
    try {
      const {
        name,
        videoUrl,
        description = null,
        tags = [],
        visibility = 'private',
        uploadMethod = 'file_upload',
        uploadSource = null
      } = avatarData;

      if (!name || name.trim() === '') {
        throw new Error('Avatar name is required');
      }

      if (!videoUrl) {
        throw new Error('Video URL is required');
      }

      const characterId = uuidv4();

      // Create character record with pending status
      const result = await database.query(`
        INSERT INTO characters (
          id, user_id, name, description, creation_method,
          image_urls, preview_image_url, metadata, tags, visibility, status,
          avatar_type, processing_status, processing_progress, video_url
        ) VALUES ($1, $2, $3, $4, 'video', $5, $6, $7, $8, $9, 'active', 'video', 'pending', 0, $10)
        RETURNING *
      `, [
        characterId,
        userId,
        name.trim(),
        description,
        [], // No image URLs for video-based
        null, // Preview will be generated
        JSON.stringify({ upload_method: uploadMethod, upload_source: uploadSource }),
        tags,
        visibility,
        videoUrl
      ]);

      // Start processing
      await AvatarProcessingService.createAvatarFromVideo(userId, characterId, videoUrl, {
        uploadMethod,
        uploadSource
      });

      logger.info(`Avatar from video created: ${characterId} - ${name} by user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating avatar from video:', error);
      throw error;
    }
  }

  /**
   * Create avatar from photos
   * @param {number} userId - User ID
   * @param {Object} avatarData - Avatar data
   * @param {string} avatarData.name - Avatar name
   * @param {string[]} avatarData.photoUrls - Array of photo URLs
   * @param {string} avatarData.description - Optional description
   * @param {string[]} avatarData.tags - Optional tags
   * @param {string} avatarData.visibility - 'private' or 'public'
   */
  async createAvatarFromPhotos(userId, avatarData) {
    try {
      const {
        name,
        photoUrls = [],
        description = null,
        tags = [],
        visibility = 'private'
      } = avatarData;

      if (!name || name.trim() === '') {
        throw new Error('Avatar name is required');
      }

      if (!photoUrls || photoUrls.length === 0) {
        throw new Error('At least one photo is required');
      }

      if (photoUrls.length > 10) {
        throw new Error('Maximum 10 photos allowed');
      }

      const characterId = uuidv4();
      const previewImageUrl = photoUrls[0];

      // Create character record with pending status
      const result = await database.query(`
        INSERT INTO characters (
          id, user_id, name, description, creation_method,
          image_urls, preview_image_url, metadata, tags, visibility, status,
          avatar_type, processing_status, processing_progress
        ) VALUES ($1, $2, $3, $4, 'photos', $5, $6, $7, $8, $9, 'active', 'photo', 'pending', 0)
        RETURNING *
      `, [
        characterId,
        userId,
        name.trim(),
        description,
        photoUrls,
        previewImageUrl,
        JSON.stringify({ photo_count: photoUrls.length }),
        tags,
        visibility
      ]);

      // Start processing
      await AvatarProcessingService.createAvatarFromPhotos(userId, characterId, photoUrls);

      logger.info(`Avatar from photos created: ${characterId} - ${name} by user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating avatar from photos:', error);
      throw error;
    }
  }

  /**
   * Get avatar looks
   * @param {string} characterId - Character ID
   * @param {number} userId - User ID
   */
  async getAvatarLooks(characterId, userId) {
    try {
      return await AvatarProcessingService.getAvatarLooks(characterId, userId);
    } catch (error) {
      logger.error('Error getting avatar looks:', error);
      throw error;
    }
  }

  /**
   * Get processing status
   * @param {string} characterId - Character ID
   * @param {number} userId - User ID
   */
  async getProcessingStatus(characterId, userId) {
    try {
      return await AvatarProcessingService.getProcessingStatus(characterId, userId);
    } catch (error) {
      logger.error('Error getting processing status:', error);
      throw error;
    }
  }
}

module.exports = new CharacterService();

