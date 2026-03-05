/**
 * AI Lead Scoring Service
 * ML-powered lead quality prediction and scoring
 * Uses OpenAI for pattern analysis and conversion probability
 */

const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');

class AILeadScoringService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = 'gpt-4';
  }

  /**
   * Calculate AI-powered lead score
   * @param {string} leadId - Lead ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Lead score with breakdown and insights
   */
  async calculateAILeadScore(leadId, userId) {
    try {
      // Fetch lead data with activities
      const leadResult = await database.query(
        `SELECT l.*, 
          COUNT(DISTINCT a.id) as total_activities,
          COUNT(DISTINCT CASE WHEN a.activity_type = 'email' THEN a.id END) as email_count,
          COUNT(DISTINCT CASE WHEN a.activity_type = 'call' THEN a.id END) as call_count,
          COUNT(DISTINCT CASE WHEN a.activity_type = 'meeting' THEN a.id END) as meeting_count,
          MAX(a.activity_date) as last_activity
         FROM leads l
         LEFT JOIN activities a ON a.lead_id = l.id
         WHERE l.id = $1 AND l.user_id = $2
         GROUP BY l.id`,
        [leadId, userId]
      );

      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadResult.rows[0];

      // Fetch historical conversion data for pattern analysis
      const historicalData = await this.getHistoricalConversionPatterns(userId);

      // Build analysis context
      const analysisContext = this.buildLeadAnalysisContext(lead, historicalData);

      // Get AI-powered insights
      const aiAnalysis = await this.analyzeLeadWithAI(analysisContext);

      // Calculate composite score
      const finalScore = this.calculateCompositeScore({
        aiScore: aiAnalysis.score,
        behavioralScore: this.calculateBehavioralScore(lead),
        firmographicScore: this.calculateFirmographicScore(lead),
        engagementScore: this.calculateEngagementScore(lead)
      });

      // Store the score
      await this.storeLeadScore(leadId, userId, finalScore, aiAnalysis);

      return {
        success: true,
        data: {
          leadId,
          score: finalScore.total,
          breakdown: {
            ai: aiAnalysis.score,
            behavioral: finalScore.behavioral,
            firmographic: finalScore.firmographic,
            engagement: finalScore.engagement
          },
          conversionProbability: aiAnalysis.conversionProbability,
          insights: aiAnalysis.insights,
          nextBestActions: aiAnalysis.nextBestActions,
          riskFactors: aiAnalysis.riskFactors,
          strengths: aiAnalysis.strengths
        }
      };

    } catch (error) {
      logger.error('AI lead scoring error:', error);
      throw error;
    }
  }

  /**
   * Analyze lead using AI
   */
  async analyzeLeadWithAI(context) {
    try {
      const prompt = `Analyze this sales lead and provide a comprehensive scoring assessment.

LEAD PROFILE:
- Name: ${context.lead.first_name} ${context.lead.last_name}
- Company: ${context.lead.company_name || 'Unknown'}
- Job Title: ${context.lead.job_title || 'Unknown'}
- Industry: ${context.lead.industry || 'Unknown'}
- Company Size: ${context.lead.company_size || 'Unknown'}
- Location: ${context.lead.location || 'Unknown'}

ENGAGEMENT DATA:
- Total Activities: ${context.engagement.totalActivities}
- Emails: ${context.engagement.emails}
- Calls: ${context.engagement.calls}
- Meetings: ${context.engagement.meetings}
- Last Activity: ${context.engagement.lastActivity || 'Never'}
- Days Since Last Contact: ${context.engagement.daysSinceContact || 'N/A'}

LEAD STATUS:
- Current Status: ${context.lead.status}
- Stage: ${context.lead.stage}
- Source: ${context.lead.source}
- Is Qualified: ${context.lead.is_qualified ? 'Yes' : 'No'}

BANT QUALIFICATION:
- Budget: ${context.lead.has_budget ? 'Yes' : context.lead.has_budget === false ? 'No' : 'Unknown'}
- Authority: ${context.lead.has_authority ? 'Yes' : context.lead.has_authority === false ? 'No' : 'Unknown'}
- Need: ${context.lead.has_need ? 'Yes' : context.lead.has_need === false ? 'No' : 'Unknown'}
- Timeline: ${context.lead.timeline || 'Unknown'}

HISTORICAL CONTEXT:
${context.historicalData.totalConversions > 0 ? `
- Similar leads converted: ${context.historicalData.conversionRate}%
- Average time to convert: ${context.historicalData.avgDaysToConvert} days
- Most successful lead source: ${context.historicalData.bestSource}
` : 'No historical conversion data available'}

Based on this information, provide a detailed analysis in the following JSON format:
{
  "score": 75,
  "conversionProbability": 65,
  "insights": [
    "Key insight about this lead",
    "Pattern or trend observed",
    "Important factor to consider"
  ],
  "nextBestActions": [
    "Specific action to take",
    "Follow-up recommendation",
    "Engagement strategy"
  ],
  "riskFactors": [
    "Factor that may prevent conversion",
    "Challenge to overcome"
  ],
  "strengths": [
    "Positive indicator for conversion",
    "Strong engagement signal"
  ],
  "reasoning": "Brief explanation of the score"
}

Score guidelines:
- 0-20: Very low quality lead, minimal chance of conversion
- 21-40: Low quality, needs significant nurturing
- 41-60: Medium quality, potential with proper engagement
- 61-80: High quality, strong conversion potential
- 81-100: Exceptional lead, prioritize immediately

Consider:
1. Engagement level and recency
2. BANT qualification status
3. Company fit (size, industry)
4. Historical patterns
5. Lead behavior signals`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales analyst with deep knowledge of lead scoring, conversion patterns, and sales psychology. You provide accurate, data-driven assessments of lead quality.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1200
      });

      const response = completion.choices[0].message.content;
      const analysis = JSON.parse(response.trim());

      return analysis;

    } catch (error) {
      logger.error('AI analysis error:', error);
      // Return fallback analysis
      return {
        score: 50,
        conversionProbability: 40,
        insights: ['AI analysis temporarily unavailable'],
        nextBestActions: ['Review lead manually'],
        riskFactors: ['Unable to assess'],
        strengths: ['Unable to assess'],
        reasoning: 'Fallback scoring due to AI service error'
      };
    }
  }

  /**
   * Build lead analysis context
   */
  buildLeadAnalysisContext(lead, historicalData) {
    return {
      lead: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name,
        job_title: lead.job_title,
        industry: lead.industry,
        company_size: lead.company_size,
        location: lead.location,
        status: lead.status,
        stage: lead.stage,
        source: lead.source,
        is_qualified: lead.is_qualified,
        has_budget: lead.has_budget,
        has_authority: lead.has_authority,
        has_need: lead.has_need,
        timeline: lead.timeline
      },
      engagement: {
        totalActivities: parseInt(lead.total_activities) || 0,
        emails: parseInt(lead.email_count) || 0,
        calls: parseInt(lead.call_count) || 0,
        meetings: parseInt(lead.meeting_count) || 0,
        lastActivity: lead.last_activity,
        daysSinceContact: lead.last_activity 
          ? Math.floor((Date.now() - new Date(lead.last_activity)) / (1000 * 60 * 60 * 24))
          : null
      },
      historicalData
    };
  }

  /**
   * Get historical conversion patterns
   */
  async getHistoricalConversionPatterns(userId) {
    try {
      const result = await database.query(
        `SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN stage = 'customer' THEN 1 END) as total_conversions,
          ROUND(COUNT(CASE WHEN stage = 'customer' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as conversion_rate,
          AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days_to_convert,
          MODE() WITHIN GROUP (ORDER BY source) as best_source
         FROM leads
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '6 months'`,
        [userId]
      );

      const data = result.rows[0] || {};

      return {
        totalLeads: parseInt(data.total_leads) || 0,
        totalConversions: parseInt(data.total_conversions) || 0,
        conversionRate: parseFloat(data.conversion_rate) || 0,
        avgDaysToConvert: Math.round(parseFloat(data.avg_days_to_convert)) || 0,
        bestSource: data.best_source || 'unknown'
      };

    } catch (error) {
      logger.warn('Could not fetch historical data:', error);
      return {
        totalLeads: 0,
        totalConversions: 0,
        conversionRate: 0,
        avgDaysToConvert: 0,
        bestSource: 'unknown'
      };
    }
  }

  /**
   * Calculate behavioral score (0-100)
   */
  calculateBehavioralScore(lead) {
    let score = 0;

    // Activity engagement (40 points)
    const totalActivities = parseInt(lead.total_activities) || 0;
    score += Math.min(totalActivities * 5, 40);

    // Recent engagement (30 points)
    if (lead.last_activity) {
      const daysSince = Math.floor((Date.now() - new Date(lead.last_activity)) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) score += 30;
      else if (daysSince <= 14) score += 20;
      else if (daysSince <= 30) score += 10;
    }

    // Meeting engagement (30 points)
    const meetings = parseInt(lead.meeting_count) || 0;
    score += Math.min(meetings * 15, 30);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate firmographic score (0-100)
   */
  calculateFirmographicScore(lead) {
    let score = 0;

    // Company size (25 points)
    const sizeScores = {
      '1-10': 5,
      '11-50': 10,
      '51-200': 15,
      '201-500': 20,
      '500+': 25
    };
    score += sizeScores[lead.company_size] || 10;

    // Job title/authority (25 points)
    const title = (lead.job_title || '').toLowerCase();
    if (title.includes('ceo') || title.includes('founder') || title.includes('owner')) score += 25;
    else if (title.includes('vp') || title.includes('director') || title.includes('head')) score += 20;
    else if (title.includes('manager')) score += 15;
    else score += 10;

    // Industry match (25 points) - Placeholder, should match against target industries
    score += 15;

    // Location (25 points) - Placeholder
    score += 15;

    return Math.round(score);
  }

  /**
   * Calculate engagement score (0-100)
   */
  calculateEngagementScore(lead) {
    let score = 0;

    // BANT qualification (40 points)
    if (lead.has_budget) score += 10;
    if (lead.has_authority) score += 10;
    if (lead.has_need) score += 10;
    if (lead.timeline && lead.timeline !== 'no_timeline') score += 10;

    // Qualification status (30 points)
    if (lead.is_qualified) score += 30;
    else if (lead.stage === 'sql' || lead.stage === 'mql') score += 20;

    // Lead source quality (30 points)
    const sourceScores = {
      'referral': 30,
      'website': 25,
      'social_media': 20,
      'email': 15,
      'manual': 10
    };
    score += sourceScores[lead.source] || 10;

    return Math.round(score);
  }

  /**
   * Calculate composite final score
   */
  calculateCompositeScore(scores) {
    // Weighted average
    const weights = {
      ai: 0.40,        // 40% AI analysis
      behavioral: 0.25, // 25% Behavioral
      firmographic: 0.20, // 20% Firmographic
      engagement: 0.15  // 15% Engagement
    };

    const total = Math.round(
      (scores.aiScore * weights.ai) +
      (scores.behavioralScore * weights.behavioral) +
      (scores.firmographicScore * weights.firmographic) +
      (scores.engagementScore * weights.engagement)
    );

    return {
      total: Math.min(total, 100),
      behavioral: scores.behavioralScore,
      firmographic: scores.firmographicScore,
      engagement: scores.engagementScore
    };
  }

  /**
   * Store lead score in database
   */
  async storeLeadScore(leadId, userId, scores, aiAnalysis) {
    try {
      // Update lead score
      await database.query(
        `UPDATE leads 
         SET lead_score = $1,
             behavioral_score = $2,
             firmographic_score = $3,
             updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [scores.total, scores.behavioral, scores.firmographic, leadId, userId]
      );

      // Log score history
      await database.query(
        `INSERT INTO lead_score_history (lead_id, user_id, score, ai_score, behavioral_score, firmographic_score, engagement_score, ai_insights, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT DO NOTHING`,
        [
          leadId,
          userId,
          scores.total,
          aiAnalysis.score,
          scores.behavioral,
          scores.firmographic,
          scores.engagement,
          JSON.stringify(aiAnalysis)
        ]
      );

    } catch (error) {
      logger.warn('Could not store lead score:', error.message);
    }
  }

  /**
   * Batch score multiple leads
   * @param {Array<string>} leadIds - Array of lead IDs
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Results for all leads
   */
  async batchScoreLeads(leadIds, userId) {
    const results = [];

    for (const leadId of leadIds) {
      try {
        const result = await this.calculateAILeadScore(leadId, userId);
        results.push({
          leadId,
          success: true,
          score: result.data.score,
          conversionProbability: result.data.conversionProbability
        });
      } catch (error) {
        results.push({
          leadId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      data: results,
      summary: {
        total: leadIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }
}

module.exports = new AILeadScoringService();

