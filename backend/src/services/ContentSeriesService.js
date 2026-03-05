const database = require('../database/connection');
const AIContentService = require('./AIContentService');
const logger = require('../utils/logger');

/**
 * Content Series Service
 * Generates multi-piece content campaigns and series
 */
class ContentSeriesService {
  constructor() {
    // AIContentService is exported as an instance, not a class
    this.contentService = AIContentService;
  }

  /**
   * Create a new content series
   */
  async createSeries(userId, seriesData) {
    const {
      title,
      description,
      agent_id,
      series_type,
      theme,
      topic,
      total_pieces,
      platforms,
      content_types,
      progression_type,
      start_date,
      frequency,
      timezone,
      auto_schedule,
      template_id
    } = seriesData;

    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      // Create series record
      const seriesResult = await client.query(
        `INSERT INTO content_series (
          user_id, agent_id, title, description, series_type, theme, topic,
          total_pieces, platforms, content_types, progression_type,
          start_date, frequency, timezone, auto_schedule, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'draft')
        RETURNING *`,
        [
          userId,
          agent_id,
          title,
          description,
          series_type,
          theme,
          topic,
          total_pieces,
          platforms || ['twitter'],
          content_types || ['tweet'],
          progression_type || 'linear',
          start_date,
          frequency || 'daily',
          timezone || 'UTC',
          auto_schedule || false
        ]
      );

      const series = seriesResult.rows[0];

      await client.query('COMMIT');
      return series;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating content series:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate all pieces for a content series
   */
  async generateSeries(seriesId, userId) {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      // Get series details
      const seriesResult = await client.query(
        'SELECT * FROM content_series WHERE id = $1 AND user_id = $2',
        [seriesId, userId]
      );

      if (seriesResult.rows.length === 0) {
        throw new Error('Content series not found');
      }

      const series = seriesResult.rows[0];

      // Get agent details
      const agentResult = await client.query(
        'SELECT * FROM ai_agents WHERE id = $1',
        [series.agent_id]
      );

      if (agentResult.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const agent = agentResult.rows[0];

      // Update status to generating
      await client.query(
        'UPDATE content_series SET status = $1, generation_progress = $2 WHERE id = $3',
        ['generating', 0, seriesId]
      );

      // Generate pieces based on progression type
      const pieces = await this.generateSeriesPieces(series, agent, client);

      // Update series status
      await client.query(
        'UPDATE content_series SET status = $1, generation_progress = $2, updated_at = NOW() WHERE id = $3',
        ['ready', 100, seriesId]
      );

      await client.query('COMMIT');
      return { series, pieces };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error generating content series:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate individual pieces for a series
   */
  async generateSeriesPieces(series, agent, client) {
    const pieces = [];
    const totalPieces = series.total_pieces;
    const platforms = Array.isArray(series.platforms) ? series.platforms : [series.platforms];
    const contentTypes = Array.isArray(series.content_types) ? series.content_types : [series.content_types];

    for (let i = 0; i < totalPieces; i++) {
      const pieceNumber = i + 1;
      const progress = Math.round((pieceNumber / totalPieces) * 100);

      // Update progress
      await client.query(
        'UPDATE content_series SET generation_progress = $1 WHERE id = $2',
        [progress, series.id]
      );

      // Determine platform and content type for this piece
      const platform = platforms[i % platforms.length];
      const contentType = contentTypes[i % contentTypes.length];

      // Build topic progression based on series type
      const pieceTopic = this.buildPieceTopic(series, pieceNumber, totalPieces);

      // Generate content
      try {
        const contentResult = await this.contentService.generateContent(agent, {
          content_type: contentType,
          topic: pieceTopic,
          style: this.getStyleForPiece(series, pieceNumber),
          length: this.getLengthForPiece(series, pieceNumber),
          context: this.buildContext(series, pieceNumber, totalPieces),
          hashtags: true,
          emojis: true
        });

        const contentText = Array.isArray(contentResult.content)
          ? contentResult.content[0]?.content || contentResult.content[0] || ''
          : contentResult.content || '';

        // Create piece record
        const pieceResult = await client.query(
          `INSERT INTO content_series_pieces (
            series_id, piece_number, platform, content_type, content_text, content_config, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'generated')
          RETURNING *`,
          [
            series.id,
            pieceNumber,
            platform,
            contentType,
            contentText,
            JSON.stringify({
              style: this.getStyleForPiece(series, pieceNumber),
              length: this.getLengthForPiece(series, pieceNumber),
              topic: pieceTopic
            })
          ]
        );

        pieces.push(pieceResult.rows[0]);
      } catch (error) {
        logger.error(`Error generating piece ${pieceNumber}:`, error);
        // Create piece with error status
        const errorPiece = await client.query(
          `INSERT INTO content_series_pieces (
            series_id, piece_number, platform, content_type, status, generation_error
          ) VALUES ($1, $2, $3, $4, 'failed', $5)
          RETURNING *`,
          [series.id, pieceNumber, platform, contentType, error.message]
        );
        pieces.push(errorPiece.rows[0]);
      }
    }

    return pieces;
  }

  /**
   * Build topic for a specific piece based on progression
   */
  buildPieceTopic(series, pieceNumber, totalPieces) {
    const baseTopic = series.topic;
    const progression = series.progression_type || 'linear';

    switch (progression) {
      case 'thematic':
        // Each piece explores a different aspect
        const themes = this.extractThemes(baseTopic);
        return themes[pieceNumber % themes.length] || baseTopic;
      
      case 'narrative':
        // Story progression: Introduction → Development → Climax → Resolution
        const narrativeStages = [
          'Introduction and setup',
          'Building context and background',
          'Developing the main points',
          'Reaching the climax or key insight',
          'Resolution and conclusion'
        ];
        const stage = narrativeStages[Math.min(pieceNumber - 1, narrativeStages.length - 1)];
        return `${baseTopic} - ${stage}`;
      
      case 'educational':
        // Progressive learning: Basics → Intermediate → Advanced
        const levels = ['Basics', 'Intermediate concepts', 'Advanced techniques', 'Expert insights', 'Mastery'];
        const level = levels[Math.min(pieceNumber - 1, levels.length - 1)];
        return `${baseTopic}: ${level}`;
      
      case 'linear':
      default:
        // Simple progression: Part 1, Part 2, etc.
        if (totalPieces > 1) {
          return `${baseTopic} - Part ${pieceNumber}`;
        }
        return baseTopic;
    }
  }

  /**
   * Extract themes from a topic (simple implementation)
   */
  extractThemes(topic) {
    // This could be enhanced with AI to extract actual themes
    // For now, return variations
    return [
      `${topic} - Overview`,
      `${topic} - Benefits`,
      `${topic} - Use Cases`,
      `${topic} - Best Practices`,
      `${topic} - Future Trends`
    ];
  }

  /**
   * Get style for a specific piece
   */
  getStyleForPiece(series, pieceNumber) {
    // Vary style across pieces for engagement
    const styles = ['casual', 'professional', 'friendly', 'authoritative'];
    return styles[pieceNumber % styles.length];
  }

  /**
   * Get length for a specific piece
   */
  getLengthForPiece(series, pieceNumber) {
    // Vary length for platform optimization
    return 'medium'; // Could be enhanced based on platform
  }

  /**
   * Build context for piece generation
   */
  buildContext(series, pieceNumber, totalPieces) {
    return `This is piece ${pieceNumber} of ${totalPieces} in a ${series.series_type} series about ${series.topic}. 
    ${series.theme ? `Theme: ${series.theme}` : ''}
    Previous pieces have covered related aspects. This piece should build on the narrative while being standalone.`;
  }

  /**
   * Get all series for a user
   */
  async getUserSeries(userId, status = null) {
    let query = 'SELECT * FROM content_series WHERE user_id = $1';
    const params = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Get series with all pieces
   */
  async getSeriesWithPieces(seriesId, userId) {
    const seriesResult = await database.query(
      'SELECT * FROM content_series WHERE id = $1 AND user_id = $2',
      [seriesId, userId]
    );

    if (seriesResult.rows.length === 0) {
      throw new Error('Content series not found');
    }

    const series = seriesResult.rows[0];

    const piecesResult = await database.query(
      'SELECT * FROM content_series_pieces WHERE series_id = $1 ORDER BY piece_number ASC',
      [seriesId]
    );

    return {
      ...series,
      pieces: piecesResult.rows
    };
  }

  /**
   * Schedule all pieces in a series
   */
  async scheduleSeries(seriesId, userId, scheduleConfig = {}) {
    const series = await this.getSeriesWithPieces(seriesId, userId);

    if (series.status !== 'ready') {
      throw new Error('Series must be in ready status to schedule');
    }

    const { startDate, frequency, timezone } = scheduleConfig;
    const scheduledPosts = [];

    // Calculate schedule times
    const scheduleTimes = this.calculateScheduleTimes(
      startDate || series.start_date,
      series.pieces.length,
      frequency || series.frequency,
      timezone || series.timezone
    );

    // Schedule each piece
    for (let i = 0; i < series.pieces.length; i++) {
      const piece = series.pieces[i];
      if (piece.status === 'generated' && scheduleTimes[i]) {
        // Create scheduled post (would integrate with ScheduledPostsService)
        // For now, just update the piece
        await database.query(
          `UPDATE content_series_pieces 
           SET scheduled_time = $1, status = 'scheduled' 
           WHERE id = $2`,
          [scheduleTimes[i], piece.id]
        );
      }
    }

    // Update series status
    await database.query(
      'UPDATE content_series SET status = $1, updated_at = NOW() WHERE id = $2',
      ['scheduled', seriesId]
    );

    return { scheduled: series.pieces.length };
  }

  /**
   * Calculate schedule times for series pieces
   */
  calculateScheduleTimes(startDate, pieceCount, frequency, timezone) {
    const times = [];
    const start = new Date(startDate || new Date());

    for (let i = 0; i < pieceCount; i++) {
      const time = new Date(start);
      
      switch (frequency) {
        case 'hourly':
          time.setHours(time.getHours() + i);
          break;
        case 'daily':
          time.setDate(time.getDate() + i);
          break;
        case 'weekly':
          time.setDate(time.getDate() + (i * 7));
          break;
        default:
          time.setDate(time.getDate() + i);
      }

      times.push(time);
    }

    return times;
  }

  /**
   * Get content templates
   */
  async getTemplates(userId = null, category = null, frameworkType = null) {
    let query = 'SELECT * FROM content_series_templates WHERE is_active = true';
    const params = [];

    if (userId === null) {
      query += ' AND is_system_template = true';
    } else {
      query += ' AND (is_system_template = true OR user_id = $1)';
      params.push(userId);
    }

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (frameworkType) {
      query += ` AND framework_type = $${params.length + 1}`;
      params.push(frameworkType);
    }

    query += ' ORDER BY is_system_template DESC, usage_count DESC';

    const result = await database.query(query, params);
    return result.rows;
  }

  /**
   * Create custom template
   */
  async createTemplate(userId, templateData) {
    const {
      name,
      description,
      category,
      framework_type,
      industry,
      template_structure
    } = templateData;

    const result = await database.query(
      `INSERT INTO content_series_templates (
        user_id, name, description, category, framework_type, industry, template_structure
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [userId, name, description, category, framework_type, industry, JSON.stringify(template_structure)]
    );

    return result.rows[0];
  }
}

module.exports = ContentSeriesService;

