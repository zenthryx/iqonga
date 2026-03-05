const database = require('../database/connection');
const logger = require('../utils/logger');
const TwitterAnalyticsService = require('./TwitterAnalyticsService');
const { v4: uuidv4 } = require('uuid');

/**
 * Content Performance Prediction Service
 * Predicts engagement and provides optimization suggestions
 */
class ContentPerformanceService {
  constructor() {
    this.twitterAnalytics = new TwitterAnalyticsService();
  }

  /**
   * Predict engagement for content
   * @param {string} content - Content text to analyze
   * @param {object} options - Prediction options
   * @returns {Promise<object>} Performance prediction
   */
  async predictEngagement(content, options = {}) {
    try {
      const {
        userId,
        agentId = null,
        platform = 'twitter',
        content_type = 'tweet',
        hashtags = [],
        mentions = [],
        has_media = false,
        scheduled_time = null
      } = options;

      const predictionId = uuidv4();
      
      // Get historical performance data
      const historicalData = await this.getHistoricalPerformance(userId, agentId);
      
      // Get best time to post (from Twitter Analytics)
      const bestTimes = await this.getBestPostingTimes(userId);
      
      // Calculate base engagement score
      const baseScore = this.calculateBaseEngagementScore(content, {
        content_type,
        hashtags,
        mentions,
        has_media
      });
      
      // Apply historical performance factor
      const historicalFactor = this.calculateHistoricalFactor(historicalData);
      
      // Apply timing factor
      const timingFactor = this.calculateTimingFactor(scheduled_time, bestTimes);
      
      // Calculate final engagement score
      const engagementScore = Math.min(100, Math.max(0, 
        baseScore * historicalFactor * timingFactor
      ));
      
      // Predict specific metrics
      const predictions = this.predictMetrics(engagementScore, historicalData, {
        content_type,
        has_media
      });
      
      // Calculate viral potential
      const viralPotential = this.calculateViralPotential(content, engagementScore, {
        hashtags,
        mentions,
        has_media
      });
      
      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(content, {
        engagementScore,
        viralPotential,
        bestTimes,
        hashtags,
        mentions,
        has_media,
        content_type
      });
      
      // Calculate audience match score
      const audienceMatch = await this.calculateAudienceMatch(userId, agentId, content);
      
      return {
        prediction_id: predictionId,
        engagement_score: Math.round(engagementScore),
        viral_potential: viralPotential,
        audience_match: audienceMatch,
        predictions: predictions,
        suggestions: suggestions,
        best_times: bestTimes?.top_times || [],
        historical_context: {
          avg_engagement: historicalData.avg_engagement || 0,
          total_posts: historicalData.total_posts || 0,
          best_performing_content: historicalData.best_content || null
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[ContentPerformance] Prediction failed:', error);
      throw error;
    }
  }

  /**
   * Calculate base engagement score from content features
   */
  calculateBaseEngagementScore(content, options) {
    let score = 50; // Base score
    
    const { content_type, hashtags, mentions, has_media } = options;
    const contentLength = content.length;
    
    // Length optimization (Twitter: 100-150 chars optimal)
    if (content_type === 'tweet') {
      if (contentLength >= 100 && contentLength <= 150) {
        score += 10;
      } else if (contentLength < 100) {
        score += 5;
      } else if (contentLength > 280) {
        score -= 5;
      }
    }
    
    // Hashtags (2-3 optimal)
    const hashtagCount = hashtags.length;
    if (hashtagCount >= 2 && hashtagCount <= 3) {
      score += 8;
    } else if (hashtagCount === 1 || hashtagCount === 4) {
      score += 4;
    } else if (hashtagCount > 5) {
      score -= 5; // Too many hashtags
    }
    
    // Mentions (1-2 optimal)
    const mentionCount = mentions.length;
    if (mentionCount >= 1 && mentionCount <= 2) {
      score += 5;
    } else if (mentionCount > 3) {
      score -= 3; // Too many mentions
    }
    
    // Media presence
    if (has_media) {
      score += 15; // Media significantly boosts engagement
    }
    
    // Question marks (encourage engagement)
    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount >= 1 && questionCount <= 2) {
      score += 5;
    }
    
    // Exclamation marks (show enthusiasm)
    const exclamationCount = (content.match(/!/g) || []).length;
    if (exclamationCount >= 1 && exclamationCount <= 2) {
      score += 3;
    } else if (exclamationCount > 3) {
      score -= 2; // Too many exclamations
    }
    
    // Emojis (1-2 optimal)
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount >= 1 && emojiCount <= 2) {
      score += 5;
    } else if (emojiCount > 3) {
      score -= 2;
    }
    
    // Call-to-action words
    const ctaWords = ['check', 'learn', 'discover', 'try', 'join', 'share', 'comment', 'retweet'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    if (hasCTA) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get historical performance data
   */
  async getHistoricalPerformance(userId, agentId) {
    try {
      // Get performance from scheduled_posts that have been published
      // Check if engagement_score column exists
      const columnCheck = await database.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'scheduled_posts' AND column_name = 'engagement_score'
      `);
      
      const hasEngagementScore = columnCheck.rows.length > 0;
      
      const query = `
        SELECT 
          COUNT(*) as total_posts,
          ${hasEngagementScore ? 'AVG(COALESCE(engagement_score, 0)) as avg_engagement,' : '0 as avg_engagement,'}
          ${hasEngagementScore ? 'MAX(COALESCE(engagement_score, 0)) as max_engagement,' : '0 as max_engagement,'}
          AVG(COALESCE(likes, 0)) as avg_likes,
          AVG(COALESCE(retweets, 0)) as avg_retweets,
          AVG(COALESCE(replies, 0)) as avg_replies
        FROM scheduled_posts
        WHERE user_id = $1
          AND status = 'published'
          ${hasEngagementScore ? 'AND engagement_score IS NOT NULL' : ''}
          ${agentId ? 'AND agent_id = $2' : ''}
      `;
      
      const params = agentId ? [userId, agentId] : [userId];
      const result = await database.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_posts: 0,
          avg_engagement: 0,
          max_engagement: 0,
          avg_likes: 0,
          avg_retweets: 0,
          avg_replies: 0
        };
      }
      
      // Get best performing content (use likes as fallback if engagement_score doesn't exist)
      const bestContentQuery = `
        SELECT content, ${hasEngagementScore ? 'engagement_score,' : '0 as engagement_score,'} likes, retweets, replies
        FROM scheduled_posts
        WHERE user_id = $1
          AND status = 'published'
          ${hasEngagementScore ? 'AND engagement_score IS NOT NULL' : ''}
          ${agentId ? 'AND agent_id = $2' : ''}
        ORDER BY ${hasEngagementScore ? 'engagement_score' : 'likes'} DESC
        LIMIT 1
      `;
      
      const bestResult = await database.query(bestContentQuery, params);
      
      return {
        total_posts: parseInt(result.rows[0].total_posts) || 0,
        avg_engagement: parseFloat(result.rows[0].avg_engagement) || 0,
        max_engagement: parseFloat(result.rows[0].max_engagement) || 0,
        avg_likes: parseFloat(result.rows[0].avg_likes) || 0,
        avg_retweets: parseFloat(result.rows[0].avg_retweets) || 0,
        avg_replies: parseFloat(result.rows[0].avg_replies) || 0,
        best_content: bestResult.rows[0] || null
      };
    } catch (error) {
      logger.error('[ContentPerformance] Failed to get historical performance:', error);
      return {
        total_posts: 0,
        avg_engagement: 0,
        max_engagement: 0,
        avg_likes: 0,
        avg_retweets: 0,
        avg_replies: 0
      };
    }
  }

  /**
   * Calculate historical performance factor
   */
  calculateHistoricalFactor(historicalData) {
    if (historicalData.total_posts === 0) {
      return 1.0; // No history, use base score
    }
    
    // If user has good historical performance, boost prediction
    const avgEngagement = historicalData.avg_engagement || 0;
    
    if (avgEngagement > 70) {
      return 1.15; // 15% boost for high performers
    } else if (avgEngagement > 50) {
      return 1.05; // 5% boost for average performers
    } else if (avgEngagement < 30) {
      return 0.95; // 5% reduction for low performers
    }
    
    return 1.0;
  }

  /**
   * Get best posting times from Twitter Analytics
   */
  async getBestPostingTimes(userId) {
    try {
      const analytics = await this.twitterAnalytics.getBestTimes(userId);
      
      if (analytics && analytics.top_times) {
        return {
          top_times: analytics.top_times.slice(0, 5),
          heatmap_data: analytics.heatmap_data || []
        };
      }
      
      // Fallback: default best times
      return {
        top_times: [
          { hour: 14, day: 'Monday', score: 0.8 },
          { hour: 15, day: 'Tuesday', score: 0.8 },
          { hour: 16, day: 'Wednesday', score: 0.8 },
          { hour: 14, day: 'Thursday', score: 0.75 },
          { hour: 15, day: 'Friday', score: 0.75 }
        ],
        heatmap_data: []
      };
    } catch (error) {
      logger.error('[ContentPerformance] Failed to get best times:', error);
      return {
        top_times: [],
        heatmap_data: []
      };
    }
  }

  /**
   * Calculate timing factor based on scheduled time
   */
  calculateTimingFactor(scheduledTime, bestTimes) {
    if (!scheduledTime || !bestTimes.top_times || bestTimes.top_times.length === 0) {
      return 1.0; // No timing info, use base score
    }
    
    const scheduledDate = new Date(scheduledTime);
    const scheduledHour = scheduledDate.getHours();
    const scheduledDay = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if scheduled time matches best times
    const matchingTime = bestTimes.top_times.find(time => 
      time.hour === scheduledHour && time.day === scheduledDay
    );
    
    if (matchingTime) {
      return 1.2; // 20% boost for optimal timing
    }
    
    // Check if hour is close to best times
    const bestHours = bestTimes.top_times.map(t => t.hour);
    const hourDiff = Math.min(...bestHours.map(h => Math.abs(h - scheduledHour)));
    
    if (hourDiff <= 1) {
      return 1.1; // 10% boost for close timing
    } else if (hourDiff <= 2) {
      return 1.05; // 5% boost
    }
    
    return 1.0;
  }

  /**
   * Predict specific engagement metrics
   */
  predictMetrics(engagementScore, historicalData, options) {
    const { content_type, has_media } = options;
    
    // Base predictions (scaled by engagement score)
    const baseLikes = content_type === 'tweet' ? 10 : 5;
    const baseRetweets = content_type === 'tweet' ? 2 : 1;
    const baseReplies = content_type === 'tweet' ? 1 : 0.5;
    
    // Apply engagement score multiplier
    const multiplier = engagementScore / 50; // 50 is baseline
    
    // Apply historical average if available
    const historicalMultiplier = historicalData.avg_engagement > 0
      ? historicalData.avg_engagement / 50
      : 1.0;
    
    // Media boost
    const mediaMultiplier = has_media ? 1.5 : 1.0;
    
    const finalMultiplier = multiplier * historicalMultiplier * mediaMultiplier;
    
    return {
      predicted_likes: Math.round(baseLikes * finalMultiplier),
      predicted_retweets: Math.round(baseRetweets * finalMultiplier),
      predicted_replies: Math.round(baseReplies * finalMultiplier),
      predicted_impressions: Math.round((baseLikes + baseRetweets) * 10 * finalMultiplier)
    };
  }

  /**
   * Calculate viral potential
   */
  calculateViralPotential(content, engagementScore, options) {
    const { hashtags, mentions, has_media } = options;
    
    let viralScore = engagementScore;
    
    // Trending hashtags boost viral potential
    if (hashtags.length > 0) {
      viralScore += 5;
    }
    
    // Mentions of influencers/celebrities boost viral potential
    if (mentions.length > 0) {
      viralScore += 5;
    }
    
    // Media significantly boosts viral potential
    if (has_media) {
      viralScore += 10;
    }
    
    // Controversial or thought-provoking content
    const provocativeWords = ['shocking', 'amazing', 'incredible', 'unbelievable', 'breaking'];
    const hasProvocative = provocativeWords.some(word => 
      content.toLowerCase().includes(word)
    );
    if (hasProvocative) {
      viralScore += 5;
    }
    
    // Calculate viral potential category
    if (viralScore >= 80) {
      return { score: viralScore, category: 'high', label: 'High Viral Potential' };
    } else if (viralScore >= 60) {
      return { score: viralScore, category: 'medium', label: 'Medium Viral Potential' };
    } else {
      return { score: viralScore, category: 'low', label: 'Low Viral Potential' };
    }
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizationSuggestions(content, options) {
    const suggestions = [];
    const {
      engagementScore,
      viralPotential,
      bestTimes,
      hashtags,
      mentions,
      has_media,
      content_type
    } = options;
    
    // Hashtag suggestions
    if (hashtags.length === 0) {
      suggestions.push({
        type: 'hashtag',
        priority: 'high',
        message: 'Add 2-3 relevant hashtags to increase discoverability (+8% engagement)',
        impact: '+8%'
      });
    } else if (hashtags.length > 5) {
      suggestions.push({
        type: 'hashtag',
        priority: 'medium',
        message: 'Reduce hashtags to 2-3 for better engagement',
        impact: '+5%'
      });
    }
    
    // Emoji suggestions
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount === 0) {
      suggestions.push({
        type: 'emoji',
        priority: 'medium',
        message: 'Add 1-2 relevant emojis to increase engagement (+5% engagement)',
        impact: '+5%'
      });
    }
    
    // Media suggestions
    if (!has_media && content_type === 'tweet') {
      suggestions.push({
        type: 'media',
        priority: 'high',
        message: 'Add an image or video to significantly boost engagement (+15% engagement)',
        impact: '+15%'
      });
    }
    
    // Length optimization
    if (content_type === 'tweet') {
      const length = content.length;
      if (length < 100) {
        suggestions.push({
          type: 'length',
          priority: 'low',
          message: 'Consider expanding to 100-150 characters for optimal engagement',
          impact: '+5%'
        });
      } else if (length > 250) {
        suggestions.push({
          type: 'length',
          priority: 'medium',
          message: 'Content is close to character limit. Consider shortening for better readability',
          impact: '+3%'
        });
      }
    }
    
    // Timing suggestions
    if (bestTimes.top_times && bestTimes.top_times.length > 0) {
      const bestTime = bestTimes.top_times[0];
      suggestions.push({
        type: 'timing',
        priority: 'high',
        message: `Post at ${bestTime.hour}:00 on ${bestTime.day} for best engagement (+20% engagement)`,
        impact: '+20%',
        optimal_time: `${bestTime.day} at ${bestTime.hour}:00`
      });
    }
    
    // CTA suggestions
    const ctaWords = ['check', 'learn', 'discover', 'try', 'join', 'share', 'comment'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    if (!hasCTA) {
      suggestions.push({
        type: 'cta',
        priority: 'medium',
        message: 'Add a call-to-action to encourage engagement (+5% engagement)',
        impact: '+5%'
      });
    }
    
    // Question suggestions
    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount === 0) {
      suggestions.push({
        type: 'question',
        priority: 'low',
        message: 'Consider adding a question to encourage replies (+5% engagement)',
        impact: '+5%'
      });
    }
    
    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    return suggestions;
  }

  /**
   * Calculate audience match score
   */
  async calculateAudienceMatch(userId, agentId, content) {
    try {
      // Get agent's audience data if available
      if (agentId) {
        // Check if target_audience column exists
        const columnCheck = await database.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'ai_agents' AND column_name = 'target_audience'
        `);
        
        const hasTargetAudience = columnCheck.rows.length > 0;
        
        const agentResult = await database.query(
          `SELECT ${hasTargetAudience ? 'target_audience,' : ''} personality_type FROM ai_agents WHERE id = $1`,
          [agentId]
        );
        
        if (agentResult.rows.length > 0) {
          const agent = agentResult.rows[0];
          // Simple matching based on personality and content tone
          // This could be enhanced with actual audience analytics
          return {
            score: 75, // Placeholder
            factors: [
              { name: 'Personality Match', score: 80 },
              { name: 'Tone Consistency', score: 70 }
            ]
          };
        }
      }
      
      // Default score if no agent data
      return {
        score: 70,
        factors: [
          { name: 'Content Quality', score: 70 }
        ]
      };
    } catch (error) {
      logger.error('[ContentPerformance] Failed to calculate audience match:', error);
      return {
        score: 70,
        factors: []
      };
    }
  }

  /**
   * Save prediction to database
   */
  async savePrediction(prediction) {
    try {
      await database.query(`
        CREATE TABLE IF NOT EXISTS content_predictions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          prediction_id UUID UNIQUE NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          engagement_score INTEGER NOT NULL,
          viral_potential JSONB,
          predictions JSONB,
          suggestions JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await database.query(`
        INSERT INTO content_predictions (
          prediction_id, user_id, agent_id, content, engagement_score,
          viral_potential, predictions, suggestions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (prediction_id) DO UPDATE
        SET engagement_score = $5, suggestions = $8, created_at = NOW()
      `, [
        prediction.prediction_id,
        prediction.user_id,
        prediction.agent_id,
        prediction.content,
        prediction.engagement_score,
        JSON.stringify(prediction.viral_potential),
        JSON.stringify(prediction.predictions),
        JSON.stringify(prediction.suggestions)
      ]);
    } catch (error) {
      logger.error('[ContentPerformance] Failed to save prediction:', error);
      // Don't throw, just log
    }
  }
}

module.exports = ContentPerformanceService;

