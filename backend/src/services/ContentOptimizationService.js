const database = require('../database/connection');
const logger = require('../utils/logger');
const AIContentService = require('./AIContentService');

/**
 * Content Optimization Assistant Service
 * Provides real-time suggestions for content optimization
 */
class ContentOptimizationService {
  constructor() {
    this.contentService = AIContentService;
  }

  /**
   * Analyze content and provide optimization suggestions
   * @param {string} content - Content to analyze
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Optimization suggestions
   */
  async analyzeContent(content, options = {}) {
    try {
      const {
        platform = 'twitter',
        content_type = 'tweet',
        userId = null,
        agentId = null
      } = options;

      const analysis = {
        readability: this.calculateReadability(content),
        seo: this.analyzeSEO(content, platform),
        engagement: this.analyzeEngagement(content, platform),
        character_count: content.length,
        word_count: content.split(/\s+/).filter(w => w.length > 0).length,
        hashtags: this.extractHashtags(content),
        mentions: this.extractMentions(content),
        suggestions: [],
        score: 0
      };

      // Generate suggestions
      analysis.suggestions = await this.generateSuggestions(content, analysis, options);

      // Calculate overall score
      analysis.score = this.calculateOverallScore(analysis);

      // Get hashtag suggestions from Keyword Intelligence if available
      if (userId) {
        try {
          const hashtagSuggestions = await this.getHashtagSuggestions(content, userId);
          if (hashtagSuggestions.length > 0) {
            analysis.hashtag_suggestions = hashtagSuggestions;
          }
        } catch (error) {
          logger.debug('[ContentOptimization] Hashtag suggestions not available:', error.message);
        }
      }

      return analysis;
    } catch (error) {
      logger.error('[ContentOptimization] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate readability score
   */
  calculateReadability(content) {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = words.reduce((count, word) => {
      return count + this.countSyllables(word);
    }, 0);

    if (words.length === 0 || sentences.length === 0) {
      return {
        score: 0,
        level: 'N/A',
        grade: 0
      };
    }

    // Flesch Reading Ease Score
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Determine reading level
    let level = 'Very Easy';
    let grade = 5;
    if (fleschScore >= 90) {
      level = 'Very Easy';
      grade = 5;
    } else if (fleschScore >= 80) {
      level = 'Easy';
      grade = 6;
    } else if (fleschScore >= 70) {
      level = 'Fairly Easy';
      grade = 7;
    } else if (fleschScore >= 60) {
      level = 'Standard';
      grade = 8;
    } else if (fleschScore >= 50) {
      level = 'Fairly Difficult';
      grade = 10;
    } else if (fleschScore >= 30) {
      level = 'Difficult';
      grade = 12;
    } else {
      level = 'Very Difficult';
      grade = 15;
    }

    return {
      score: Math.round(fleschScore),
      level,
      grade,
      avg_sentence_length: Math.round(avgSentenceLength),
      avg_syllables_per_word: Math.round(avgSyllablesPerWord * 10) / 10
    };
  }

  /**
   * Count syllables in a word
   */
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Analyze SEO aspects
   */
  analyzeSEO(content, platform) {
    const analysis = {
      keyword_density: {},
      meta_suggestions: [],
      score: 0
    };

    // Extract keywords (common words, excluding stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Count keyword frequency
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Calculate keyword density
    const totalWords = words.length;
    Object.keys(wordFreq).forEach(word => {
      analysis.keyword_density[word] = (wordFreq[word] / totalWords * 100).toFixed(2);
    });

    // SEO suggestions
    if (Object.keys(analysis.keyword_density).length === 0) {
      analysis.meta_suggestions.push({
        type: 'keyword',
        priority: 'medium',
        message: 'Consider adding relevant keywords to improve discoverability'
      });
    }

    // Meta description suggestion (for longer content)
    if (platform === 'linkedin' && content.length > 150) {
      const metaDescription = content.substring(0, 155) + '...';
      analysis.meta_suggestions.push({
        type: 'meta',
        priority: 'low',
        message: 'Meta description suggestion',
        suggestion: metaDescription
      });
    }

    // Calculate SEO score
    const keywordScore = Object.keys(analysis.keyword_density).length > 0 ? 50 : 0;
    const lengthScore = content.length >= 100 ? 30 : content.length >= 50 ? 20 : 10;
    analysis.score = keywordScore + lengthScore;

    return analysis;
  }

  /**
   * Analyze engagement potential
   */
  analyzeEngagement(content, platform) {
    const analysis = {
      score: 0,
      factors: [],
      suggestions: []
    };

    let score = 50; // Base score

    // Character count optimization
    const charCount = content.length;
    if (platform === 'twitter') {
      if (charCount >= 100 && charCount <= 150) {
        score += 15;
        analysis.factors.push({ name: 'Optimal length', impact: '+15%' });
      } else if (charCount < 100) {
        score += 5;
        analysis.suggestions.push({
          type: 'length',
          priority: 'low',
          message: 'Consider expanding to 100-150 characters for better engagement',
          impact: '+10%'
        });
      } else if (charCount > 250) {
        score -= 5;
        analysis.suggestions.push({
          type: 'length',
          priority: 'medium',
          message: 'Content is close to character limit. Consider shortening',
          impact: '+5%'
        });
      }
    }

    // Hashtags
    const hashtagCount = (content.match(/#\w+/g) || []).length;
    if (hashtagCount >= 2 && hashtagCount <= 3) {
      score += 10;
      analysis.factors.push({ name: 'Optimal hashtags', impact: '+10%' });
    } else if (hashtagCount === 0) {
      score -= 10;
      analysis.suggestions.push({
        type: 'hashtag',
        priority: 'high',
        message: 'Add 2-3 relevant hashtags to increase discoverability',
        impact: '+10%'
      });
    } else if (hashtagCount > 5) {
      score -= 5;
      analysis.suggestions.push({
        type: 'hashtag',
        priority: 'medium',
        message: 'Reduce hashtags to 2-3 for better engagement',
        impact: '+5%'
      });
    }

    // Mentions
    const mentionCount = (content.match(/@\w+/g) || []).length;
    if (mentionCount >= 1 && mentionCount <= 2) {
      score += 5;
      analysis.factors.push({ name: 'Strategic mentions', impact: '+5%' });
    } else if (mentionCount > 3) {
      score -= 3;
      analysis.suggestions.push({
        type: 'mention',
        priority: 'low',
        message: 'Too many mentions may reduce engagement',
        impact: '+3%'
      });
    }

    // Questions
    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount >= 1 && questionCount <= 2) {
      score += 8;
      analysis.factors.push({ name: 'Engaging questions', impact: '+8%' });
    } else if (questionCount === 0) {
      analysis.suggestions.push({
        type: 'question',
        priority: 'medium',
        message: 'Add a question to encourage replies',
        impact: '+8%'
      });
    }

    // Emojis
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount >= 1 && emojiCount <= 2) {
      score += 5;
      analysis.factors.push({ name: 'Appropriate emojis', impact: '+5%' });
    } else if (emojiCount === 0) {
      analysis.suggestions.push({
        type: 'emoji',
        priority: 'low',
        message: 'Add 1-2 relevant emojis to increase engagement',
        impact: '+5%'
      });
    }

    // Call-to-action
    const ctaWords = ['check', 'learn', 'discover', 'try', 'join', 'share', 'comment', 'retweet', 'click', 'visit'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    if (hasCTA) {
      score += 5;
      analysis.factors.push({ name: 'Call-to-action', impact: '+5%' });
    } else {
      analysis.suggestions.push({
        type: 'cta',
        priority: 'medium',
        message: 'Add a call-to-action to encourage engagement',
        impact: '+5%'
      });
    }

    analysis.score = Math.min(100, Math.max(0, score));
    return analysis;
  }

  /**
   * Extract hashtags from content
   */
  extractHashtags(content) {
    const hashtags = (content.match(/#\w+/g) || []).map(h => h.substring(1));
    return hashtags.map(tag => ({
      tag,
      position: content.indexOf(`#${tag}`)
    }));
  }

  /**
   * Extract mentions from content
   */
  extractMentions(content) {
    const mentions = (content.match(/@\w+/g) || []).map(m => m.substring(1));
    return mentions.map(mention => ({
      mention,
      position: content.indexOf(`@${mention}`)
    }));
  }

  /**
   * Generate optimization suggestions
   */
  async generateSuggestions(content, analysis, options) {
    const suggestions = [];

    // Readability suggestions
    if (analysis.readability.score < 60) {
      suggestions.push({
        type: 'readability',
        priority: 'medium',
        message: `Content is ${analysis.readability.level.toLowerCase()}. Consider simplifying for better readability.`,
        impact: '+10%',
        current_score: analysis.readability.score
      });
    }

    // Character count suggestions
    const { platform, content_type } = options;
    if (platform === 'twitter' && content_type === 'tweet') {
      const charCount = content.length;
      if (charCount < 100) {
        suggestions.push({
          type: 'length',
          priority: 'low',
          message: 'Consider expanding to 100-150 characters for optimal engagement',
          impact: '+10%',
          current: charCount,
          recommended: '100-150'
        });
      } else if (charCount > 250) {
        suggestions.push({
          type: 'length',
          priority: 'medium',
          message: 'Content is close to character limit. Consider shortening',
          impact: '+5%',
          current: charCount,
          recommended: '< 250'
        });
      }
    }

    // Combine with engagement suggestions
    suggestions.push(...analysis.engagement.suggestions);

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return suggestions;
  }

  /**
   * Calculate overall optimization score
   */
  calculateOverallScore(analysis) {
    let score = 0;

    // Readability (30%)
    const readabilityScore = analysis.readability.score / 100;
    score += readabilityScore * 30;

    // SEO (20%)
    const seoScore = analysis.seo.score / 100;
    score += seoScore * 20;

    // Engagement (50%)
    const engagementScore = analysis.engagement.score / 100;
    score += engagementScore * 50;

    return Math.round(score);
  }

  /**
   * Get hashtag suggestions from Keyword Intelligence
   */
  async getHashtagSuggestions(content, userId) {
    try {
      // Extract main keywords from content
      const words = content.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3); // Top 3 keywords

      if (words.length === 0) {
        return [];
      }

      // Try to get keyword suggestions (this would integrate with Keyword Intelligence)
      // For now, return basic suggestions based on content
      const suggestions = [];
      words.forEach(word => {
        if (word.length > 3) {
          suggestions.push(`#${word.charAt(0).toUpperCase() + word.slice(1)}`);
        }
      });

      return suggestions.slice(0, 5);
    } catch (error) {
      logger.error('[ContentOptimization] Failed to get hashtag suggestions:', error);
      return [];
    }
  }

  /**
   * Get tone consistency score
   */
  async analyzeToneConsistency(content, agentId) {
    try {
      if (!agentId) {
        return { score: 0, consistent: false, message: 'No agent specified' };
      }

      // Get agent's personality and voice tone
      const agentResult = await database.query(
        'SELECT personality_type, voice_tone FROM ai_agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length === 0) {
        return { score: 0, consistent: false, message: 'Agent not found' };
      }

      const agent = agentResult.rows[0];
      
      // Simple tone analysis (could be enhanced with AI)
      const toneWords = {
        professional: ['ensure', 'implement', 'optimize', 'leverage', 'facilitate'],
        casual: ['hey', 'awesome', 'cool', 'yeah', 'gonna'],
        enthusiastic: ['amazing', 'incredible', 'fantastic', 'excited', 'thrilled'],
        thoughtful: ['consider', 'reflect', 'contemplate', 'ponder', 'analyze']
      };

      const agentToneWords = toneWords[agent.voice_tone?.toLowerCase()] || [];
      const contentLower = content.toLowerCase();
      const matches = agentToneWords.filter(word => contentLower.includes(word)).length;
      const consistency = agentToneWords.length > 0 
        ? (matches / agentToneWords.length) * 100 
        : 50;

      return {
        score: Math.round(consistency),
        consistent: consistency >= 50,
        message: consistency >= 50 
          ? 'Tone is consistent with agent personality'
          : 'Consider adjusting tone to match agent personality'
      };
    } catch (error) {
      logger.error('[ContentOptimization] Tone analysis failed:', error);
      return { score: 0, consistent: false, message: 'Analysis unavailable' };
    }
  }
}

module.exports = ContentOptimizationService;

