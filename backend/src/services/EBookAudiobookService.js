const logger = require('../utils/logger');
const EBookProjectService = require('./EBookProjectService');
const VoiceService = require('./VoiceService');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const CreditService = require('./CreditService');
const ServicePricingService = require('./ServicePricingService');

/**
 * EBook Audiobook Service
 * Generates audiobooks from eBook content using VoiceService
 */
class EBookAudiobookService {
  constructor() {
    this.voiceService = VoiceService;
    this.creditService = new CreditService();
  }

  /**
   * Generate audiobook for an entire project
   */
  async generateAudiobook(projectId, userId, options = {}) {
    try {
      logger.info(`Generating audiobook for project ${projectId}`);

      // Get project
      const project = await EBookProjectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get all chapters
      const chapters = await EBookProjectService.getChapters(projectId, userId);
      if (!chapters || chapters.length === 0) {
        throw new Error('Project has no chapters');
      }

      // Check if audiobook already exists
      const existingAudiobook = await database.query(`
        SELECT * FROM audiobooks
        WHERE project_id = $1 AND user_id = $2 AND status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `, [projectId, userId]);

      if (existingAudiobook.rows.length > 0 && !options.regenerate) {
        return {
          success: true,
          audiobook: existingAudiobook.rows[0],
          message: 'Audiobook already exists'
        };
      }

      // Calculate total cost
      const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0);
      const creditCost = await ServicePricingService.getServiceCost('audiobook_generation', {
        wordCount: totalWordCount,
        chapters: chapters.length
      });

      // Deduct credits
      const generationId = uuidv4();
      try {
        await this.creditService.deductCredits(userId, 'audiobook_generation', creditCost, generationId);
      } catch (creditError) {
        return {
          success: false,
          error: 'Insufficient credits',
          details: creditError.message,
          requiredCredits: creditCost
        };
      }

      // Create audiobook record
      const audiobookId = uuidv4();
      await database.query(`
        INSERT INTO audiobooks (
          id, project_id, user_id, status, total_chapters, total_duration_seconds,
          credits_used, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        audiobookId,
        projectId,
        userId,
        'processing',
        chapters.length,
        0, // Will be updated when complete
        creditCost,
        JSON.stringify({
          voice: options.voice || 'alloy',
          speed: options.speed || 1.0,
          generationId
        })
      ]);

      // Generate audio for each chapter (async, in background)
      this.generateChaptersAsync(audiobookId, projectId, chapters, options).catch(error => {
        logger.error('Failed to generate audiobook chapters:', error);
        // Update status to failed
        database.query(`
          UPDATE audiobooks
          SET status = 'failed', metadata = jsonb_set(metadata, '{error}', $1::jsonb)
          WHERE id = $2
        `, [JSON.stringify(error.message), audiobookId]).catch(updateError => {
          logger.error('Failed to update audiobook status:', updateError);
        });
      });

      return {
        success: true,
        audiobook: {
          id: audiobookId,
          projectId,
          status: 'processing',
          totalChapters: chapters.length,
          creditsUsed: creditCost
        },
        message: 'Audiobook generation started. This may take a while.'
      };
    } catch (error) {
      logger.error('Failed to generate audiobook:', error);
      throw error;
    }
  }

  /**
   * Generate audio for all chapters asynchronously
   */
  async generateChaptersAsync(audiobookId, projectId, chapters, options) {
    try {
      const audioFiles = [];
      let totalDuration = 0;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        logger.info(`Generating audio for chapter ${i + 1}/${chapters.length}: ${chapter.title || chapter.chapter_number}`);

        try {
          // Generate audio using VoiceService
          const audioResult = await this.voiceService.textToSpeech(chapter.content, {
            voice: options.voice || 'alloy',
            speed: options.speed || 1.0,
            format: 'mp3'
          });

          if (audioResult && audioResult.audioUrl) {
            audioFiles.push({
              chapterId: chapter.id,
              chapterNumber: chapter.chapter_number,
              title: chapter.title,
              audioUrl: audioResult.audioUrl,
              duration: audioResult.duration || 0
            });
            totalDuration += audioResult.duration || 0;
          }

          // Small delay between chapters to avoid rate limiting
          if (i < chapters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (chapterError) {
          logger.error(`Failed to generate audio for chapter ${chapter.chapter_number}:`, chapterError);
          // Continue with other chapters
        }
      }

      // Update audiobook record
      await database.query(`
        UPDATE audiobooks
        SET 
          status = 'completed',
          total_duration_seconds = $1,
          audio_files = $2::jsonb,
          updated_at = NOW()
        WHERE id = $3
      `, [
        totalDuration,
        JSON.stringify(audioFiles),
        audiobookId
      ]);

      logger.info(`Audiobook generation completed: ${audiobookId}`);
    } catch (error) {
      logger.error('Failed to generate audiobook chapters:', error);
      throw error;
    }
  }

  /**
   * Get audiobook status
   */
  async getAudiobookStatus(audiobookId, userId) {
    try {
      const result = await database.query(`
        SELECT a.*, p.title as project_title
        FROM audiobooks a
        JOIN ebook_projects p ON a.project_id = p.id
        WHERE a.id = $1 AND a.user_id = $2
      `, [audiobookId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get audiobook status:', error);
      throw error;
    }
  }

  /**
   * Get all audiobooks for a project
   */
  async getProjectAudiobooks(projectId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM audiobooks
        WHERE project_id = $1 AND user_id = $2
        ORDER BY created_at DESC
      `, [projectId, userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get project audiobooks:', error);
      throw error;
    }
  }
}

module.exports = new EBookAudiobookService();

