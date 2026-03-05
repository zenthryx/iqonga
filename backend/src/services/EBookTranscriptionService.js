const logger = require('../utils/logger');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const CreditService = require('./CreditService');
const ServicePricingService = require('./ServicePricingService');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * EBook Transcription Service
 * Transcribes video/audio files to text for use in eBooks
 * 
 * Note: This service uses OpenAI Whisper API for transcription
 */
class EBookTranscriptionService {
  constructor() {
    this.creditService = new CreditService();
    this.uploadsDir = path.join(__dirname, '../../uploads/transcriptions');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Transcribe a video or audio file
   */
  async transcribeFile(userId, filePath, options = {}) {
    try {
      logger.info(`Transcribing file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Calculate credit cost
      const fileSize = fs.statSync(filePath).size;
      const creditCost = await ServicePricingService.getServiceCost('transcription', {
        fileSize,
        duration: options.duration || null
      });

      // Deduct credits
      const generationId = uuidv4();
      try {
        await this.creditService.deductCredits(userId, 'transcription', creditCost, generationId);
      } catch (creditError) {
        throw new Error(`Insufficient credits: ${creditError.message}`);
      }

      // Create transcription record
      const transcriptionId = uuidv4();
      await database.query(`
        INSERT INTO transcriptions (
          id, user_id, source_type, source_url, status, credits_used,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        transcriptionId,
        userId,
        options.sourceType || 'file',
        filePath,
        'processing',
        creditCost,
        JSON.stringify({
          fileName: path.basename(filePath),
          fileSize,
          generationId
        })
      ]);

      // Transcribe using OpenAI Whisper API
      const transcriptionText = await this.transcribeWithWhisper(filePath, options);

      // Update transcription record
      await database.query(`
        UPDATE transcriptions
        SET 
          status = 'completed',
          transcribed_text = $1,
          word_count = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [
        transcriptionText,
        transcriptionText.split(/\s+/).length,
        transcriptionId
      ]);

      return {
        success: true,
        transcription: {
          id: transcriptionId,
          text: transcriptionText,
          wordCount: transcriptionText.split(/\s+/).length,
          creditsUsed: creditCost
        }
      };
    } catch (error) {
      logger.error('Failed to transcribe file:', error);
      
      // Update status to failed
      try {
        await database.query(`
          UPDATE transcriptions
          SET status = 'failed', metadata = jsonb_set(metadata, '{error}', $1::jsonb)
          WHERE id = (SELECT id FROM transcriptions WHERE user_id = $2 ORDER BY created_at DESC LIMIT 1)
        `, [JSON.stringify(error.message), userId]);
      } catch (updateError) {
        logger.error('Failed to update transcription status:', updateError);
      }

      throw error;
    }
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  async transcribeWithWhisper(filePath, options = {}) {
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Create a readable stream from the file
      const fileStream = fs.createReadStream(filePath);

      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: options.model || 'whisper-1',
        language: options.language || undefined,
        prompt: options.prompt || undefined,
        response_format: 'text'
      });

      return transcription;
    } catch (error) {
      logger.error('Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe from URL (video/audio)
   */
  async transcribeFromUrl(userId, url, options = {}) {
    try {
      logger.info(`Transcribing from URL: ${url}`);

      // Download file temporarily
      const tempFilePath = path.join(this.uploadsDir, `${uuidv4()}.tmp`);
      
      try {
        const response = await axios({
          url,
          method: 'GET',
          responseType: 'stream',
          timeout: 300000 // 5 minutes
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Transcribe the downloaded file
        const result = await this.transcribeFile(userId, tempFilePath, {
          ...options,
          sourceType: 'url',
          sourceUrl: url
        });

        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp file:', cleanupError);
        }

        return result;
      } catch (downloadError) {
        // Clean up temp file if it exists
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          logger.warn('Failed to cleanup temp file:', cleanupError);
        }
        throw downloadError;
      }
    } catch (error) {
      logger.error('Failed to transcribe from URL:', error);
      throw error;
    }
  }

  /**
   * Get transcription by ID
   */
  async getTranscription(transcriptionId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM transcriptions
        WHERE id = $1 AND user_id = $2
      `, [transcriptionId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get transcription:', error);
      throw error;
    }
  }

  /**
   * Get all transcriptions for a user
   */
  async getUserTranscriptions(userId, limit = 20) {
    try {
      const result = await database.query(`
        SELECT * FROM transcriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user transcriptions:', error);
      throw error;
    }
  }
}

module.exports = new EBookTranscriptionService();

