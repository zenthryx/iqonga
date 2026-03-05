const database = require('../database/connection');
const logger = require('../utils/logger');
const OpenAI = require('openai');

/**
 * Influencer Marketing Service
 * AI-powered platform for discovering brand-safe, authentic creators by topic
 */
class InfluencerService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Discover influencers by topic
   * @param {Object} options - Search options
   * @param {string[]} options.topics - Topics to search for
   * @param {string[]} options.platforms - Platforms to search (optional)
   * @param {Object} options.filters - Additional filters (follower range, engagement, etc.)
   * @param {number} options.limit - Maximum results
   * @param {number} options.offset - Pagination offset
   */
  async discoverInfluencers(options = {}) {
    const {
      topics = [],
      platforms = [],
      filters = {},
      limit = 20,
      offset = 0
    } = options;

    try {
      let query = `
        SELECT 
          i.*,
          COUNT(DISTINCT ci.id) as campaign_count,
          COUNT(DISTINCT si.id) as saved_count
        FROM influencers i
        LEFT JOIN campaign_influencers ci ON i.id = ci.influencer_id
        LEFT JOIN saved_influencers si ON i.id = si.influencer_id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      // Filter by topics (using array overlap)
      if (topics.length > 0) {
        query += ` AND (i.categories && $${paramIndex}::text[] OR i.tags && $${paramIndex}::text[])`;
        params.push(JSON.stringify(topics));
        paramIndex++;
      }

      // Filter by platforms
      if (platforms.length > 0) {
        query += ` AND i.platform = ANY($${paramIndex}::text[])`;
        params.push(JSON.stringify(platforms));
        paramIndex++;
      }

      // Filter by follower count range
      if (filters.minFollowers !== undefined) {
        query += ` AND i.follower_count >= $${paramIndex}`;
        params.push(filters.minFollowers);
        paramIndex++;
      }
      if (filters.maxFollowers !== undefined) {
        query += ` AND i.follower_count <= $${paramIndex}`;
        params.push(filters.maxFollowers);
        paramIndex++;
      }

      // Filter by engagement rate
      if (filters.minEngagementRate !== undefined) {
        query += ` AND i.engagement_rate >= $${paramIndex}`;
        params.push(filters.minEngagementRate);
        paramIndex++;
      }

      // Filter by brand safety score
      if (filters.minBrandSafetyScore !== undefined) {
        query += ` AND i.brand_safety_score >= $${paramIndex}`;
        params.push(filters.minBrandSafetyScore);
        paramIndex++;
      }

      // Filter by authenticity score
      if (filters.minAuthenticityScore !== undefined) {
        query += ` AND i.authenticity_score >= $${paramIndex}`;
        params.push(filters.minAuthenticityScore);
        paramIndex++;
      }

      // Filter by verified status
      if (filters.verified !== undefined) {
        query += ` AND i.verified = $${paramIndex}`;
        params.push(filters.verified);
        paramIndex++;
      }

      // Group by and order
      query += ` GROUP BY i.id`;

      // Order by relevance (can be enhanced with AI scoring)
      if (topics.length > 0) {
        // Order by topic match and engagement
        query += ` ORDER BY 
          (CASE WHEN i.categories && $1::text[] THEN 1 ELSE 0 END) DESC,
          i.engagement_rate DESC,
          i.follower_count DESC`;
      } else {
        query += ` ORDER BY i.engagement_rate DESC, i.follower_count DESC`;
      }

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);

      // Enhance results with AI scoring if topics provided
      if (topics.length > 0 && this.openai) {
        const enhanced = await Promise.all(
          result.rows.map(async (influencer) => {
            const relevanceScore = await this.calculateTopicRelevance(
              influencer,
              topics
            );
            return {
              ...influencer,
              relevanceScore
            };
          })
        );
        return enhanced.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      return result.rows;
    } catch (error) {
      logger.error('Failed to discover influencers:', error);
      throw error;
    }
  }

  /**
   * Calculate topic relevance score using AI
   */
  async calculateTopicRelevance(influencer, topics) {
    if (!this.openai) {
      // Fallback: simple keyword matching
      const influencerTopics = [
        ...(influencer.categories || []),
        ...(influencer.tags || [])
      ];
      const matches = topics.filter((topic) =>
        influencerTopics.some((it) =>
          it.toLowerCase().includes(topic.toLowerCase())
        )
      );
      return matches.length / topics.length;
    }

    try {
      const prompt = `Rate the relevance of this influencer to these topics (0-100):
      
Influencer: ${influencer.username} (@${influencer.username})
Bio: ${influencer.bio || 'N/A'}
Categories: ${(influencer.categories || []).join(', ')}
Tags: ${(influencer.tags || []).join(', ')}

Topics: ${topics.join(', ')}

Respond with only a number between 0-100 representing relevance score.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.3
      });

      const score = parseInt(response.choices[0].message.content.trim()) || 50;
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      logger.error('Failed to calculate topic relevance:', error);
      return 50; // Default score
    }
  }

  /**
   * Analyze influencer for brand safety and authenticity
   */
  async analyzeInfluencer(influencerId) {
    try {
      const influencer = await this.getInfluencerById(influencerId);
      if (!influencer) {
        throw new Error('Influencer not found');
      }

      // Get recent content
      const recentContent = await database.query(
        `SELECT * FROM influencer_content 
         WHERE influencer_id = $1 
         ORDER BY posted_at DESC 
         LIMIT 20`,
        [influencerId]
      );

      // Calculate brand safety score
      const brandSafetyScore = await this.calculateBrandSafetyScore(
        influencer,
        recentContent.rows
      );

      // Calculate authenticity score
      const authenticityScore = await this.calculateAuthenticityScore(
        influencer,
        recentContent.rows
      );

      // Update influencer scores
      await database.query(
        `UPDATE influencers 
         SET brand_safety_score = $1, 
             authenticity_score = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [brandSafetyScore, authenticityScore, influencerId]
      );

      return {
        brandSafetyScore,
        authenticityScore,
        analysis: {
          contentQuality: this.analyzeContentQuality(recentContent.rows),
          engagementPatterns: this.analyzeEngagementPatterns(recentContent.rows),
          topicConsistency: this.analyzeTopicConsistency(recentContent.rows)
        }
      };
    } catch (error) {
      logger.error('Failed to analyze influencer:', error);
      throw error;
    }
  }

  /**
   * Calculate brand safety score using AI
   */
  async calculateBrandSafetyScore(influencer, contentSamples) {
    if (!this.openai) {
      return 75; // Default score
    }

    try {
      const contentSummary = contentSamples
        .slice(0, 10)
        .map((c) => c.caption || '')
        .join('\n\n');

      const prompt = `Analyze this influencer's content for brand safety. Consider:
- Inappropriate language or content
- Controversial topics
- Negative sentiment
- Compliance with advertising standards
- Overall brand alignment potential

Influencer: ${influencer.username}
Bio: ${influencer.bio || 'N/A'}
Recent Content Samples:
${contentSummary || 'No content available'}

Respond with only a number between 0-100 representing brand safety score (higher = safer).`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.3
      });

      const score = parseInt(response.choices[0].message.content.trim()) || 75;
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      logger.error('Failed to calculate brand safety score:', error);
      return 75; // Default score
    }
  }

  /**
   * Calculate authenticity score using AI
   */
  async calculateAuthenticityScore(influencer, contentSamples) {
    if (!this.openai) {
      return 70; // Default score
    }

    try {
      const contentSummary = contentSamples
        .slice(0, 10)
        .map((c) => c.caption || '')
        .join('\n\n');

      const prompt = `Analyze this influencer's authenticity. Consider:
- Genuine engagement with audience
- Authentic voice and personality
- Consistent content themes
- Real vs. fake engagement patterns
- Transparency in sponsored content

Influencer: ${influencer.username}
Bio: ${influencer.bio || 'N/A'}
Recent Content Samples:
${contentSummary || 'No content available'}

Respond with only a number between 0-100 representing authenticity score (higher = more authentic).`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.3
      });

      const score = parseInt(response.choices[0].message.content.trim()) || 70;
      return Math.min(100, Math.max(0, score));
    } catch (error) {
      logger.error('Failed to calculate authenticity score:', error);
      return 70; // Default score
    }
  }

  /**
   * Get influencer by ID
   */
  async getInfluencerById(influencerId) {
    try {
      const result = await database.query(
        `SELECT * FROM influencers WHERE id = $1`,
        [influencerId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get influencer:', error);
      throw error;
    }
  }

  /**
   * Get influencer content samples
   */
  async getInfluencerContent(influencerId, limit = 20) {
    try {
      const result = await database.query(
        `SELECT * FROM influencer_content 
         WHERE influencer_id = $1 
         ORDER BY posted_at DESC 
         LIMIT $2`,
        [influencerId, limit]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get influencer content:', error);
      throw error;
    }
  }

  /**
   * Analyze content quality
   */
  analyzeContentQuality(contentSamples) {
    if (contentSamples.length === 0) {
      return { score: 0, factors: [] };
    }

    const avgEngagement =
      contentSamples.reduce((sum, c) => sum + (c.engagement_rate || 0), 0) /
      contentSamples.length;

    const hasVariety = new Set(contentSamples.map((c) => c.content_type)).size > 1;

    return {
      score: Math.min(100, avgEngagement * 10),
      factors: [
        `Average engagement: ${avgEngagement.toFixed(2)}%`,
        hasVariety ? 'Content variety: Good' : 'Content variety: Limited'
      ]
    };
  }

  /**
   * Analyze engagement patterns
   */
  analyzeEngagementPatterns(contentSamples) {
    if (contentSamples.length === 0) {
      return { pattern: 'unknown', suspicious: false };
    }

    // Simple heuristic: check for suspicious patterns
    const engagementRates = contentSamples.map((c) => c.engagement_rate || 0);
    const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    const variance =
      engagementRates.reduce((sum, rate) => sum + Math.pow(rate - avgEngagement, 2), 0) /
      engagementRates.length;

    // Very low variance might indicate fake engagement
    const suspicious = variance < 0.1 && avgEngagement > 5;

    return {
      pattern: suspicious ? 'suspicious' : 'normal',
      suspicious,
      averageEngagement: avgEngagement,
      variance
    };
  }

  /**
   * Analyze topic consistency
   */
  analyzeTopicConsistency(contentSamples) {
    if (contentSamples.length === 0) {
      return { consistency: 0, topics: [] };
    }

    const allTopics = contentSamples.flatMap((c) => c.topics || []);
    const topicFrequency = {};
    allTopics.forEach((topic) => {
      topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
    });

    const sortedTopics = Object.entries(topicFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    const consistency = Math.min(100, (sortedTopics.length / 5) * 100);

    return {
      consistency,
      topics: sortedTopics
    };
  }

  /**
   * Save influencer search
   */
  async saveSearch(userId, searchQuery, filters, resultsCount) {
    try {
      const result = await database.query(
        `INSERT INTO influencer_searches 
         (user_id, search_query, filters, results_count, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [userId, searchQuery, JSON.stringify(filters), resultsCount]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save search:', error);
      throw error;
    }
  }

  /**
   * Save influencer to user's favorites
   */
  async saveInfluencer(userId, influencerId, notes = null, tags = []) {
    try {
      const result = await database.query(
        `INSERT INTO saved_influencers (user_id, influencer_id, notes, tags, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, influencer_id) 
         DO UPDATE SET notes = EXCLUDED.notes, tags = EXCLUDED.tags
         RETURNING *`,
        [userId, influencerId, notes, JSON.stringify(tags)]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save influencer:', error);
      throw error;
    }
  }

  /**
   * Get saved influencers for user
   */
  async getSavedInfluencers(userId) {
    try {
      const result = await database.query(
        `SELECT i.*, si.notes, si.tags, si.created_at as saved_at
         FROM saved_influencers si
         JOIN influencers i ON si.influencer_id = i.id
         WHERE si.user_id = $1
         ORDER BY si.created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Failed to get saved influencers:', error);
      throw error;
    }
  }
}

module.exports = new InfluencerService();

