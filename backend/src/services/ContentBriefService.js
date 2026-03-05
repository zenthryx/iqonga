const database = require('../database/connection');
const logger = require('../utils/logger');
const AIContentService = require('./AIContentService');
const ContentResearchService = require('./ContentResearchService');
const GrokApiService = require('./grokApiService');

/**
 * Content Brief Generator Service
 * Generates strategic content briefs before content creation
 */
class ContentBriefService {
  constructor() {
    this.contentService = AIContentService;
    this.researchService = new ContentResearchService();
    this.grokService = new GrokApiService();
  }

  /**
   * Generate a comprehensive content brief
   * @param {string} topic - Content topic
   * @param {object} options - Brief generation options
   * @returns {Promise<object>} Content brief
   */
  async generateBrief(topic, options = {}) {
    try {
      const {
        platform = 'twitter',
        content_type = 'tweet',
        target_audience = null,
        goals = [],
        userId = null,
        agentId = null
      } = options;

      // Get agent information if provided
      let agentInfo = null;
      if (agentId) {
        try {
          const agentResult = await database.query(
            'SELECT * FROM ai_agents WHERE id = $1',
            [agentId]
          );
          if (agentResult.rows.length > 0) {
            agentInfo = agentResult.rows[0];
          }
        } catch (error) {
          logger.debug('[ContentBrief] Agent lookup failed:', error.message);
        }
      }

      // Generate brief sections
      const brief = {
        topic,
        platform,
        content_type,
        generated_at: new Date().toISOString(),
        target_audience: await this.analyzeTargetAudience(topic, target_audience, platform, agentInfo),
        key_messages: await this.identifyKeyMessages(topic, platform, agentInfo),
        content_structure: await this.createContentStructure(topic, content_type, platform),
        seo_keywords: await this.researchKeywords(topic, userId),
        competitor_analysis: await this.analyzeCompetitors(topic, platform),
        content_goals: this.defineContentGoals(goals, platform),
        tone_guidelines: this.generateToneGuidelines(agentInfo, platform),
        call_to_action: this.suggestCallToAction(platform, content_type),
        best_practices: this.getBestPractices(platform, content_type)
      };

      // Calculate brief completeness score
      brief.completeness_score = this.calculateCompleteness(brief);

      return brief;
    } catch (error) {
      logger.error('[ContentBrief] Brief generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze target audience
   */
  async analyzeTargetAudience(topic, providedAudience, platform, agentInfo) {
    try {
      if (providedAudience) {
        return {
          primary: providedAudience,
          demographics: null,
          interests: null,
          pain_points: null,
          source: 'user_provided'
        };
      }

      // Use Grok to analyze target audience
      const prompt = `Analyze the target audience for content about "${topic}" on ${platform}. 
      Provide:
      1. Primary audience description
      2. Demographics (age, location, profession if relevant)
      3. Key interests
      4. Main pain points or challenges
      
      Format as JSON with keys: primary, demographics, interests, pain_points.`;

      const response = await this.grokService.generateResponse(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return {
          ...parsed,
          source: 'ai_analysis'
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          primary: response.substring(0, 200) || 'General audience interested in the topic',
          demographics: null,
          interests: null,
          pain_points: null,
          source: 'ai_analysis',
          raw_response: response
        };
      }
    } catch (error) {
      logger.error('[ContentBrief] Audience analysis failed:', error);
      return {
        primary: 'General audience interested in the topic',
        demographics: null,
        interests: null,
        pain_points: null,
        source: 'fallback'
      };
    }
  }

  /**
   * Identify key messages
   */
  async identifyKeyMessages(topic, platform, agentInfo) {
    try {
      const agentContext = agentInfo 
        ? `The content should align with an agent personality: ${agentInfo.personality_type}, voice tone: ${agentInfo.voice_tone || 'professional'}`
        : '';

      const prompt = `For content about "${topic}" on ${platform}, identify 3-5 key messages that should be communicated.
      ${agentContext}
      
      Format as JSON array of objects with keys: message, priority (high/medium/low), rationale.`;

      const response = await this.grokService.generateResponse(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (parseError) {
        // Fallback
        return [
          {
            message: `Highlight the main value proposition of ${topic}`,
            priority: 'high',
            rationale: 'Core message that should be emphasized'
          },
          {
            message: `Address common questions or concerns about ${topic}`,
            priority: 'medium',
            rationale: 'Builds trust and addresses audience needs'
          }
        ];
      }
    } catch (error) {
      logger.error('[ContentBrief] Key messages identification failed:', error);
      return [
        {
          message: `Communicate the value of ${topic}`,
          priority: 'high',
          rationale: 'Core message'
        }
      ];
    }
  }

  /**
   * Create content structure outline
   */
  async createContentStructure(topic, contentType, platform) {
    try {
      const prompt = `Create a content structure outline for a ${contentType} about "${topic}" on ${platform}.
      
      Provide a JSON object with:
      - opening: How to start the content
      - body: Main points to cover (array)
      - closing: How to conclude
      - estimated_length: Estimated character count`;

      const response = await this.grokService.generateResponse(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return parsed;
      } catch (parseError) {
        // Fallback structure
        return {
          opening: 'Hook the audience with an engaging opening',
          body: [
            'Present the main topic or value proposition',
            'Provide supporting details or benefits',
            'Include relevant examples or use cases'
          ],
          closing: 'End with a call-to-action or key takeaway',
          estimated_length: contentType === 'tweet' ? 150 : 500
        };
      }
    } catch (error) {
      logger.error('[ContentBrief] Structure creation failed:', error);
      return {
        opening: 'Engaging opening',
        body: ['Main point 1', 'Main point 2'],
        closing: 'Strong conclusion',
        estimated_length: 200
      };
    }
  }

  /**
   * Research SEO keywords
   */
  async researchKeywords(topic, userId) {
    try {
      // Try to get keywords from Keyword Intelligence if available
      if (userId) {
        try {
          const keywordResult = await database.query(
            `SELECT keyword, platform, sentiment_score, mention_count 
             FROM keyword_monitors 
             WHERE user_id = $1 
             AND keyword ILIKE $2 
             LIMIT 10`,
            [userId, `%${topic}%`]
          );

          if (keywordResult.rows.length > 0) {
            return {
              primary: topic,
              related: keywordResult.rows.map(row => ({
                keyword: row.keyword,
                platform: row.platform,
                sentiment: row.sentiment_score,
                mentions: row.mention_count
              })),
              source: 'keyword_intelligence'
            };
          }
        } catch (error) {
          logger.debug('[ContentBrief] Keyword Intelligence lookup failed:', error.message);
        }
      }

      // Fallback: Use Grok to suggest keywords
      const prompt = `Suggest 5-10 relevant SEO keywords and hashtags for content about "${topic}".
      Format as JSON array of strings.`;

      const response = await this.grokService.generateResponse(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return {
          primary: topic,
          related: Array.isArray(parsed) ? parsed.map(k => ({ keyword: k, platform: 'all' })) : [],
          source: 'ai_suggestions'
        };
      } catch (parseError) {
        return {
          primary: topic,
          related: [],
          source: 'fallback'
        };
      }
    } catch (error) {
      logger.error('[ContentBrief] Keyword research failed:', error);
      return {
        primary: topic,
        related: [],
        source: 'error'
      };
    }
  }

  /**
   * Analyze competitor content
   */
  async analyzeCompetitors(topic, platform) {
    try {
      const prompt = `Analyze what competitors or similar accounts are doing for content about "${topic}" on ${platform}.
      
      Provide insights as JSON with:
      - common_themes: Array of common themes
      - content_formats: Popular formats used
      - engagement_tactics: Tactics that work well
      - gaps: Opportunities or gaps in current content`;

      const response = await this.grokService.generateResponse(prompt);
      
      try {
        const parsed = JSON.parse(response);
        return parsed;
      } catch (parseError) {
        return {
          common_themes: [`Content about ${topic}`],
          content_formats: ['Text posts', 'Visual content'],
          engagement_tactics: ['Questions', 'Hashtags', 'Mentions'],
          gaps: ['Opportunity to provide unique perspective']
        };
      }
    } catch (error) {
      logger.error('[ContentBrief] Competitor analysis failed:', error);
      return {
        common_themes: [],
        content_formats: [],
        engagement_tactics: [],
        gaps: []
      };
    }
  }

  /**
   * Define content goals
   */
  defineContentGoals(providedGoals, platform) {
    if (providedGoals && providedGoals.length > 0) {
      return providedGoals;
    }

    // Default goals based on platform
    const defaultGoals = {
      twitter: [
        'Increase engagement (likes, retweets, replies)',
        'Build brand awareness',
        'Drive website traffic',
        'Establish thought leadership'
      ],
      linkedin: [
        'Professional networking',
        'B2B lead generation',
        'Industry expertise demonstration',
        'Professional relationship building'
      ],
      instagram: [
        'Visual brand storytelling',
        'Community engagement',
        'Product showcase',
        'Influencer collaboration'
      ]
    };

    return defaultGoals[platform] || defaultGoals.twitter;
  }

  /**
   * Generate tone guidelines
   */
  generateToneGuidelines(agentInfo, platform) {
    const guidelines = {
      professional: {
        language: 'Formal, clear, and authoritative',
        voice: 'Expert and trustworthy',
        avoid: 'Slang, excessive emojis, casual language'
      },
      casual: {
        language: 'Conversational and friendly',
        voice: 'Approachable and relatable',
        avoid: 'Jargon, overly formal language'
      },
      enthusiastic: {
        language: 'Energetic and positive',
        voice: 'Excited and motivating',
        avoid: 'Negative language, low energy'
      },
      thoughtful: {
        language: 'Reflective and insightful',
        voice: 'Wise and contemplative',
        avoid: 'Superficial content, rushed tone'
      }
    };

    const agentTone = agentInfo?.voice_tone?.toLowerCase() || 'professional';
    const baseGuidelines = guidelines[agentTone] || guidelines.professional;

    // Platform-specific adjustments
    const platformAdjustments = {
      twitter: 'Keep it concise and punchy',
      linkedin: 'Maintain professional tone',
      instagram: 'Visual-first, engaging captions'
    };

    return {
      ...baseGuidelines,
      platform_note: platformAdjustments[platform] || ''
    };
  }

  /**
   * Suggest call-to-action
   */
  suggestCallToAction(platform, contentType) {
    const ctas = {
      twitter: [
        'What are your thoughts?',
        'Share your experience below',
        'Retweet if you agree',
        'Follow for more insights'
      ],
      linkedin: [
        'What\'s your take on this?',
        'Share your thoughts in the comments',
        'Connect with me for more insights',
        'Let\'s discuss in the comments'
      ],
      instagram: [
        'Double tap if you agree',
        'Share your thoughts below',
        'Tag someone who needs to see this',
        'Save this post for later'
      ]
    };

    const platformCTAs = ctas[platform] || ctas.twitter;
    return {
      suggestions: platformCTAs,
      recommended: platformCTAs[0]
    };
  }

  /**
   * Get best practices
   */
  getBestPractices(platform, contentType) {
    const practices = {
      twitter: {
        tweet: [
          'Keep tweets under 280 characters for optimal engagement',
          'Use 2-3 relevant hashtags',
          'Include visuals when possible',
          'Post during peak engagement hours',
          'Engage with replies promptly'
        ],
        thread: [
          'Start with a hook tweet',
          'Number your tweets (1/5, 2/5, etc.)',
          'Each tweet should stand alone but build on previous',
          'End with a strong conclusion and CTA'
        ]
      },
      linkedin: {
        post: [
          'Professional tone is essential',
          'Use industry-relevant keywords',
          'Include a clear call-to-action',
          'Engage with comments thoughtfully',
          'Share valuable insights, not just promotions'
        ]
      },
      instagram: {
        post: [
          'High-quality visuals are crucial',
          'Use 5-10 relevant hashtags',
          'Write engaging captions',
          'Post consistently',
          'Engage with your audience'
        ]
      }
    };

    return practices[platform]?.[contentType] || practices.twitter.tweet;
  }

  /**
   * Calculate brief completeness score
   */
  calculateCompleteness(brief) {
    let score = 0;
    let maxScore = 0;

    // Target audience (20%)
    maxScore += 20;
    if (brief.target_audience?.primary) score += 20;

    // Key messages (20%)
    maxScore += 20;
    if (brief.key_messages && brief.key_messages.length > 0) {
      score += Math.min(20, (brief.key_messages.length / 3) * 20);
    }

    // Content structure (15%)
    maxScore += 15;
    if (brief.content_structure?.body && brief.content_structure.body.length > 0) {
      score += 15;
    }

    // SEO keywords (15%)
    maxScore += 15;
    if (brief.seo_keywords?.related && brief.seo_keywords.related.length > 0) {
      score += 15;
    }

    // Competitor analysis (10%)
    maxScore += 10;
    if (brief.competitor_analysis?.common_themes && brief.competitor_analysis.common_themes.length > 0) {
      score += 10;
    }

    // Content goals (10%)
    maxScore += 10;
    if (brief.content_goals && brief.content_goals.length > 0) {
      score += 10;
    }

    // Tone guidelines (10%)
    maxScore += 10;
    if (brief.tone_guidelines?.language) {
      score += 10;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Save brief to database
   */
  async saveBrief(userId, brief) {
    try {
      // Check if content_briefs table exists
      await database.query(`
        CREATE TABLE IF NOT EXISTS content_briefs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
          topic TEXT NOT NULL,
          platform VARCHAR(50),
          content_type VARCHAR(50),
          brief_data JSONB NOT NULL,
          completeness_score INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      const result = await database.query(`
        INSERT INTO content_briefs (
          user_id, agent_id, topic, platform, content_type,
          brief_data, completeness_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId,
        brief.agent_id || null,
        brief.topic,
        brief.platform,
        brief.content_type,
        JSON.stringify(brief),
        brief.completeness_score
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('[ContentBrief] Failed to save brief:', error);
      throw error;
    }
  }

  /**
   * Get user's saved briefs
   */
  async getUserBriefs(userId, limit = 20, offset = 0) {
    try {
      const result = await database.query(`
        SELECT * FROM content_briefs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows.map(row => ({
        ...row,
        brief_data: typeof row.brief_data === 'string' 
          ? JSON.parse(row.brief_data) 
          : row.brief_data
      }));
    } catch (error) {
      logger.error('[ContentBrief] Failed to get user briefs:', error);
      return [];
    }
  }

  /**
   * Get brief by ID
   */
  async getBriefById(briefId, userId) {
    try {
      const result = await database.query(`
        SELECT * FROM content_briefs
        WHERE id = $1 AND user_id = $2
      `, [briefId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        brief_data: typeof row.brief_data === 'string' 
          ? JSON.parse(row.brief_data) 
          : row.brief_data
      };
    } catch (error) {
      logger.error('[ContentBrief] Failed to get brief:', error);
      throw error;
    }
  }
}

module.exports = ContentBriefService;

