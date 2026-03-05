const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const VideoGenerationService = require('./VideoGenerationService');

class AvatarProcessingService {
  constructor() {
    this.heygenEnabled = VideoGenerationService.providers?.heygen?.enabled || false;
    this.heygenApiKey = VideoGenerationService.providers?.heygen?.apiKey;
    this.heygenBaseUrl = VideoGenerationService.providers?.heygen?.baseUrl || 'https://api.heygen.com';
  }

  /**
   * Create avatar from video
   * @param {number} userId - User ID
   * @param {string} characterId - Character ID
   * @param {string} videoUrl - Video file URL
   * @param {Object} options - Processing options
   */
  async createAvatarFromVideo(userId, characterId, videoUrl, options = {}) {
    try {
      const {
        uploadMethod = 'file_upload', // 'file_upload', 'webcam', 'phone', 'google_drive'
        uploadSource = null
      } = options;

      // Create processing job
      const jobId = uuidv4();
      await this.createProcessingJob(jobId, characterId, userId, {
        job_type: 'video_processing',
        input_data: {
          video_url: videoUrl,
          upload_method: uploadMethod,
          upload_source: uploadSource
        }
      });

      // Update character status
      await database.query(`
        UPDATE characters
        SET 
          processing_status = 'processing',
          processing_progress = 0,
          processing_started_at = NOW(),
          video_url = $1,
          avatar_type = 'video'
        WHERE id = $2 AND user_id = $3
      `, [videoUrl, characterId, userId]);

      // Process video (async)
      this.processVideoAvatar(characterId, userId, videoUrl, jobId, options)
        .catch(error => {
          logger.error(`[AvatarProcessing] Video processing failed for character ${characterId}:`, error);
          this.updateProcessingStatus(characterId, 'failed', 0, error.message);
        });

      return {
        success: true,
        jobId,
        characterId,
        status: 'processing'
      };
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to create avatar from video:', error);
      throw error;
    }
  }

  /**
   * Create avatar from photos
   * @param {number} userId - User ID
   * @param {string} characterId - Character ID
   * @param {string[]} photoUrls - Array of photo URLs
   * @param {Object} options - Processing options
   */
  async createAvatarFromPhotos(userId, characterId, photoUrls, options = {}) {
    try {
      // Create processing job
      const jobId = uuidv4();
      await this.createProcessingJob(jobId, characterId, userId, {
        job_type: 'photo_processing',
        input_data: {
          photo_urls: photoUrls,
          photo_count: photoUrls.length
        }
      });

      // Update character status
      await database.query(`
        UPDATE characters
        SET 
          processing_status = 'processing',
          processing_progress = 0,
          processing_started_at = NOW(),
          avatar_type = 'photo'
        WHERE id = $1 AND user_id = $2
      `, [characterId, userId]);

      // Process photos (async)
      this.processPhotoAvatar(characterId, userId, photoUrls, jobId, options)
        .catch(error => {
          logger.error(`[AvatarProcessing] Photo processing failed for character ${characterId}:`, error);
          this.updateProcessingStatus(characterId, 'failed', 0, error.message);
        });

      return {
        success: true,
        jobId,
        characterId,
        status: 'processing'
      };
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to create avatar from photos:', error);
      throw error;
    }
  }

  /**
   * Process video to create avatar
   * @private
   */
  async processVideoAvatar(characterId, userId, videoUrl, jobId, options) {
    try {
      // Update progress: 10% - Starting
      await this.updateProcessingProgress(characterId, jobId, 10, 'Validating video...');

      // Validate video (check if file exists, get metadata)
      // TODO: Add actual video validation using ffprobe or similar

      // Update progress: 30% - Processing
      await this.updateProcessingProgress(characterId, jobId, 30, 'Processing video...');

      let heygenAvatarId = null;

      // If HeyGen is available, use it for processing
      if (this.heygenEnabled) {
        try {
          heygenAvatarId = await this.processWithHeyGen(videoUrl, options);
          logger.info(`[AvatarProcessing] HeyGen avatar created: ${heygenAvatarId}`);
        } catch (heygenError) {
          logger.warn(`[AvatarProcessing] HeyGen processing failed, using internal processing: ${heygenError.message}`);
          // Fall back to internal processing
        }
      }

      // Update progress: 70% - Finalizing
      await this.updateProcessingProgress(characterId, jobId, 70, 'Finalizing avatar...');

      // Create default look from video
      await this.createDefaultLook(characterId, userId, {
        name: 'Default Look',
        look_type: 'video',
        video_url: videoUrl,
        is_default: true
      });

      // Update progress: 90% - Completing
      await this.updateProcessingProgress(characterId, jobId, 90, 'Completing...');

      // Update character with final status
      await database.query(`
        UPDATE characters
        SET 
          processing_status = 'completed',
          processing_progress = 100,
          processing_completed_at = NOW(),
          heygen_avatar_id = COALESCE($1, heygen_avatar_id),
          looks_count = 1
        WHERE id = $2
      `, [heygenAvatarId, characterId]);

      // Complete processing job
      await this.completeProcessingJob(jobId, {
        heygen_avatar_id: heygenAvatarId
      });

      logger.info(`[AvatarProcessing] Avatar created successfully: ${characterId}`);
    } catch (error) {
      logger.error(`[AvatarProcessing] Video processing error:`, error);
      throw error;
    }
  }

  /**
   * Process photos to create avatar
   * @private
   */
  async processPhotoAvatar(characterId, userId, photoUrls, jobId, options) {
    try {
      // Update progress: 10% - Starting
      await this.updateProcessingProgress(characterId, jobId, 10, 'Validating photos...');

      // Validate photos
      // TODO: Add actual photo validation

      // Update progress: 30% - Processing
      await this.updateProcessingProgress(characterId, jobId, 30, 'Processing photos...');

      let heygenAvatarId = null;

      // If HeyGen is available, use it for photo-to-avatar conversion
      if (this.heygenEnabled) {
        try {
          // HeyGen supports photo-based avatar creation
          heygenAvatarId = await this.processPhotosWithHeyGen(photoUrls, options);
          logger.info(`[AvatarProcessing] HeyGen photo avatar created: ${heygenAvatarId}`);
        } catch (heygenError) {
          logger.warn(`[AvatarProcessing] HeyGen photo processing failed: ${heygenError.message}`);
          // Fall back to internal processing
        }
      }

      // Update progress: 70% - Creating looks
      await this.updateProcessingProgress(characterId, jobId, 70, 'Creating looks...');

      // Create looks from photos
      for (let i = 0; i < photoUrls.length; i++) {
        await this.createLook(characterId, userId, {
          name: `Look ${i + 1}`,
          look_type: 'photo',
          image_url: photoUrls[i],
          thumbnail_url: photoUrls[i],
          is_default: i === 0,
          order_index: i
        });
      }

      // Update progress: 90% - Finalizing
      await this.updateProcessingProgress(characterId, jobId, 90, 'Finalizing...');

      // Update character with final status
      await database.query(`
        UPDATE characters
        SET 
          processing_status = 'completed',
          processing_progress = 100,
          processing_completed_at = NOW(),
          heygen_avatar_id = COALESCE($1, heygen_avatar_id),
          looks_count = $2
        WHERE id = $3
      `, [heygenAvatarId, photoUrls.length, characterId]);

      // Complete processing job
      await this.completeProcessingJob(jobId, {
        heygen_avatar_id: heygenAvatarId,
        looks_created: photoUrls.length
      });

      logger.info(`[AvatarProcessing] Photo avatar created successfully: ${characterId}`);
    } catch (error) {
      logger.error(`[AvatarProcessing] Photo processing error:`, error);
      throw error;
    }
  }

  /**
   * Process video with HeyGen API
   * @private
   */
  async processWithHeyGen(videoUrl, options) {
    try {
      // HeyGen API endpoint for creating avatar from video
      // Note: This is a placeholder - actual HeyGen API may have different endpoints
      const endpoint = `${this.heygenBaseUrl}/v2/avatars/create_from_video`;
      
      // For now, return null as HeyGen video-based avatar creation may require different API
      // This would need to be implemented based on actual HeyGen API documentation
      logger.info('[AvatarProcessing] HeyGen video processing not yet fully implemented');
      return null;
    } catch (error) {
      logger.error('[AvatarProcessing] HeyGen video processing failed:', error);
      throw error;
    }
  }

  /**
   * Process photos with HeyGen API
   * @private
   */
  async processPhotosWithHeyGen(photoUrls, options) {
    try {
      // HeyGen API endpoint for creating talking photo from images
      // This uses HeyGen's talking photo feature
      const endpoint = `${this.heygenBaseUrl}/v2/talking_photos`;
      
      const requestData = {
        images: photoUrls,
        // Additional options can be added here
      };

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'X-Api-Key': this.heygenApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 300000, // 5 minutes
        httpsAgent: new https.Agent({
          rejectUnauthorized: true
        })
      });

      const talkingPhotoId = response.data?.data?.talking_photo_id || 
                            response.data?.talking_photo_id ||
                            response.data?.id;

      return talkingPhotoId;
    } catch (error) {
      logger.error('[AvatarProcessing] HeyGen photo processing failed:', error);
      throw error;
    }
  }

  /**
   * Create a new look for an avatar
   */
  async createLook(characterId, userId, lookData) {
    try {
      const {
        name,
        description = null,
        look_type = 'photo',
        image_url = null,
        video_url = null,
        thumbnail_url = null,
        outfit_type = null,
        setting = null,
        pose = null,
        expression = null,
        is_default = false,
        order_index = 0,
        metadata = {}
      } = lookData;

      // If setting this as default, unset other defaults
      if (is_default) {
        await database.query(`
          UPDATE avatar_looks
          SET is_default = false
          WHERE character_id = $1
        `, [characterId]);
      }

      const lookId = uuidv4();
      const result = await database.query(`
        INSERT INTO avatar_looks (
          id, character_id, user_id, name, description, look_type,
          image_url, video_url, thumbnail_url, outfit_type, setting,
          pose, expression, is_default, order_index, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `, [
        lookId, characterId, userId, name, description, look_type,
        image_url, video_url, thumbnail_url || image_url, outfit_type, setting,
        pose, expression, is_default, order_index, JSON.stringify(metadata)
      ]);

      // Update looks count
      await database.query(`
        UPDATE characters
        SET looks_count = (
          SELECT COUNT(*) FROM avatar_looks
          WHERE character_id = $1 AND is_active = true
        )
        WHERE id = $1
      `, [characterId]);

      return result.rows[0];
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to create look:', error);
      throw error;
    }
  }

  /**
   * Create default look (helper method)
   * @private
   */
  async createDefaultLook(characterId, userId, lookData) {
    return this.createLook(characterId, userId, {
      ...lookData,
      is_default: true,
      order_index: 0
    });
  }

  /**
   * Get all looks for an avatar
   */
  async getAvatarLooks(characterId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM avatar_looks
        WHERE character_id = $1 AND user_id = $2 AND is_active = true
        ORDER BY is_default DESC, order_index ASC, created_at ASC
      `, [characterId, userId]);

      return result.rows.map(look => ({
        ...look,
        metadata: typeof look.metadata === 'string' ? JSON.parse(look.metadata) : look.metadata
      }));
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to get avatar looks:', error);
      throw error;
    }
  }

  /**
   * Create processing job
   * @private
   */
  async createProcessingJob(jobId, characterId, userId, jobData) {
    try {
      await database.query(`
        INSERT INTO avatar_processing_jobs (
          id, character_id, user_id, job_type, status,
          input_data, external_service
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
      `, [
        jobId,
        characterId,
        userId,
        jobData.job_type,
        JSON.stringify(jobData.input_data),
        this.heygenEnabled ? 'heygen' : 'internal'
      ]);
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to create processing job:', error);
      throw error;
    }
  }

  /**
   * Update processing progress
   * @private
   */
  async updateProcessingProgress(characterId, jobId, progress, currentStep) {
    try {
      await database.query(`
        UPDATE avatar_processing_jobs
        SET 
          progress = $1,
          current_step = $2,
          status = CASE 
            WHEN $1 >= 100 THEN 'completed'
            WHEN $1 > 0 THEN 'processing'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE id = $3
      `, [progress, currentStep, jobId]);

      await database.query(`
        UPDATE characters
        SET 
          processing_progress = $1,
          processing_status = CASE 
            WHEN $1 >= 100 THEN 'completed'
            WHEN $1 > 0 THEN 'processing'
            ELSE 'pending'
          END
        WHERE id = $2
      `, [progress, characterId]);
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to update progress:', error);
    }
  }

  /**
   * Update processing status
   * @private
   */
  async updateProcessingStatus(characterId, status, progress, errorMessage = null) {
    try {
      await database.query(`
        UPDATE characters
        SET 
          processing_status = $1,
          processing_progress = $2,
          processing_error = $3,
          processing_completed_at = CASE 
            WHEN $1 = 'completed' OR $1 = 'failed' THEN NOW()
            ELSE processing_completed_at
          END
        WHERE id = $4
      `, [status, progress, errorMessage, characterId]);
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to update status:', error);
    }
  }

  /**
   * Complete processing job
   * @private
   */
  async completeProcessingJob(jobId, outputData) {
    try {
      await database.query(`
        UPDATE avatar_processing_jobs
        SET 
          status = 'completed',
          progress = 100,
          output_data = $1,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(outputData), jobId]);
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to complete job:', error);
    }
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(characterId, userId) {
    try {
      const characterResult = await database.query(`
        SELECT 
          processing_status, processing_progress, processing_error,
          processing_started_at, processing_completed_at
        FROM characters
        WHERE id = $1 AND user_id = $2
      `, [characterId, userId]);

      if (characterResult.rows.length === 0) {
        throw new Error('Character not found');
      }

      const jobResult = await database.query(`
        SELECT * FROM avatar_processing_jobs
        WHERE character_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [characterId]);

      return {
        character: characterResult.rows[0],
        job: jobResult.rows[0] ? {
          ...jobResult.rows[0],
          input_data: typeof jobResult.rows[0].input_data === 'string' 
            ? JSON.parse(jobResult.rows[0].input_data) 
            : jobResult.rows[0].input_data,
          output_data: typeof jobResult.rows[0].output_data === 'string'
            ? JSON.parse(jobResult.rows[0].output_data)
            : jobResult.rows[0].output_data
        } : null
      };
    } catch (error) {
      logger.error('[AvatarProcessing] Failed to get processing status:', error);
      throw error;
    }
  }
}

module.exports = new AvatarProcessingService();

