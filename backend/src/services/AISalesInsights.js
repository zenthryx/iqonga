/**
 * AI Sales Insights Service
 * Provides AI-powered insights for deals, forecasting, and sales strategy
 * Deal win probability, risk detection, and next best actions
 */

const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');

class AISalesInsights {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.model = 'gpt-4';
  }

  /**
   * Analyze deal and provide win probability + insights
   * @param {string} dealId - Deal ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Deal insights with win probability
   */
  async analyzeDeal(dealId, userId) {
    try {
      // Fetch deal with related data
      const dealResult = await database.query(
        `SELECT d.*, l.*, 
          COUNT(DISTINCT a.id) as total_activities,
          COUNT(DISTINCT CASE WHEN a.activity_type = 'meeting' THEN a.id END) as meeting_count,
          MAX(a.activity_date) as last_activity
         FROM deals d
         LEFT JOIN leads l ON l.id = d.lead_id
         LEFT JOIN activities a ON a.deal_id = d.id
         WHERE d.id = $1 AND d.user_id = $2
         GROUP BY d.id, l.id`,
        [dealId, userId]
      );

      if (dealResult.rows.length === 0) {
        throw new Error('Deal not found');
      }

      const deal = dealResult.rows[0];

      // Get historical deal data for context
      const historicalContext = await this.getHistoricalDealContext(userId);

      // Build analysis context
      const context = this.buildDealAnalysisContext(deal, historicalContext);

      // Get AI insights
      const aiInsights = await this.analyzeDealWithAI(context);

      // Store insights
      await this.storeDealInsights(dealId, userId, aiInsights);

      return {
        success: true,
        data: {
          dealId,
          dealName: deal.deal_name,
          currentStage: deal.stage,
          amount: deal.amount,
          winProbability: aiInsights.winProbability,
          forecastedCloseDate: aiInsights.forecastedCloseDate,
          daysToClose: aiInsights.daysToClose,
          insights: aiInsights.insights,
          nextBestActions: aiInsights.nextBestActions,
          riskFactors: aiInsights.riskFactors,
          opportunities: aiInsights.opportunities,
          competitivePosition: aiInsights.competitivePosition,
          recommendedStrategy: aiInsights.recommendedStrategy
        }
      };

    } catch (error) {
      logger.error('Deal analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze deal using AI
   */
  async analyzeDealWithAI(context) {
    try {
      const prompt = `Analyze this sales deal and provide comprehensive insights for winning it.

DEAL INFORMATION:
- Deal Name: ${context.deal.deal_name}
- Value: $${context.deal.amount} ${context.deal.currency}
- Stage: ${context.deal.stage}
- Expected Close: ${context.deal.expected_close_date || 'Not set'}
- Days in Pipeline: ${context.deal.daysInPipeline}
- Win Probability (Current): ${context.deal.win_probability}%

LEAD/CONTACT:
- Name: ${context.lead.first_name} ${context.lead.last_name}
- Company: ${context.lead.company_name || 'Unknown'}
- Title: ${context.lead.job_title || 'Unknown'}
- Industry: ${context.lead.industry || 'Unknown'}
- Lead Score: ${context.lead.lead_score}/100

ENGAGEMENT METRICS:
- Total Activities: ${context.engagement.totalActivities}
- Meetings Held: ${context.engagement.meetings}
- Last Activity: ${context.engagement.lastActivity || 'Never'}
- Days Since Last Contact: ${context.engagement.daysSinceContact || 'N/A'}

BANT QUALIFICATION:
- Budget: ${context.qualification.budget}
- Authority: ${context.qualification.authority}
- Need: ${context.qualification.need}
- Timeline: ${context.qualification.timeline}

HISTORICAL CONTEXT (Last 6 months):
${context.historical.totalDeals > 0 ? `
- Total Deals: ${context.historical.totalDeals}
- Won: ${context.historical.won} (${context.historical.winRate}%)
- Lost: ${context.historical.lost}
- Average Deal Size: $${context.historical.avgDealSize}
- Average Close Time: ${context.historical.avgDaysToClose} days
- Win Rate at ${context.deal.stage}: ${context.historical.stageWinRate}%
` : 'No historical data available'}

Based on this comprehensive analysis, provide insights in the following JSON format:
{
  "winProbability": 65,
  "forecastedCloseDate": "2025-02-15",
  "daysToClose": 45,
  "insights": [
    "Key insight about deal health",
    "Pattern or trend observed",
    "Important competitive factor"
  ],
  "nextBestActions": [
    {
      "action": "Specific action to take",
      "priority": "high",
      "rationale": "Why this action matters",
      "timing": "When to do it"
    }
  ],
  "riskFactors": [
    {
      "factor": "Risk description",
      "severity": "high",
      "mitigation": "How to address it"
    }
  ],
  "opportunities": [
    "Opportunity to leverage",
    "Strength to emphasize"
  ],
  "competitivePosition": "strong|moderate|weak",
  "recommendedStrategy": "Detailed strategy recommendation"
}

Analysis Guidelines:
- Win Probability: 0-100% based on all factors
- Be specific and actionable in recommendations
- Consider deal momentum and engagement trends
- Factor in historical win patterns
- Assess BANT qualification completeness
- Evaluate timeline and urgency signals`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales strategist with deep experience in deal analysis, win/loss analysis, and sales forecasting. You provide actionable, data-driven insights that help sales teams close more deals.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const response = completion.choices[0].message.content;
      const insights = JSON.parse(response.trim());

      return insights;

    } catch (error) {
      logger.error('AI deal analysis error:', error);
      // Return fallback analysis
      return {
        winProbability: 50,
        forecastedCloseDate: null,
        daysToClose: null,
        insights: ['AI analysis temporarily unavailable'],
        nextBestActions: [{ action: 'Review deal manually', priority: 'medium', rationale: 'AI service error', timing: 'ASAP' }],
        riskFactors: [{ factor: 'Unable to assess', severity: 'unknown', mitigation: 'Manual review needed' }],
        opportunities: ['Unable to assess'],
        competitivePosition: 'unknown',
        recommendedStrategy: 'Manual analysis recommended due to AI service error'
      };
    }
  }

  /**
   * Build deal analysis context
   */
  buildDealAnalysisContext(deal, historical) {
    const now = new Date();
    const createdDate = new Date(deal.created_at);
    const daysInPipeline = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

    return {
      deal: {
        deal_name: deal.deal_name,
        amount: deal.amount || 0,
        currency: deal.currency || 'USD',
        stage: deal.stage,
        expected_close_date: deal.expected_close_date,
        win_probability: deal.win_probability || 0,
        daysInPipeline
      },
      lead: {
        first_name: deal.first_name,
        last_name: deal.last_name,
        company_name: deal.company_name,
        job_title: deal.job_title,
        industry: deal.industry,
        lead_score: deal.lead_score || 0
      },
      engagement: {
        totalActivities: parseInt(deal.total_activities) || 0,
        meetings: parseInt(deal.meeting_count) || 0,
        lastActivity: deal.last_activity,
        daysSinceContact: deal.last_activity 
          ? Math.floor((now - new Date(deal.last_activity)) / (1000 * 60 * 60 * 24))
          : null
      },
      qualification: {
        budget: deal.has_budget ? 'Yes' : deal.has_budget === false ? 'No' : 'Unknown',
        authority: deal.has_authority ? 'Yes' : deal.has_authority === false ? 'No' : 'Unknown',
        need: deal.has_need ? 'Yes' : deal.has_need === false ? 'No' : 'Unknown',
        timeline: deal.timeline || 'Unknown'
      },
      historical
    };
  }

  /**
   * Get historical deal context
   */
  async getHistoricalDealContext(userId) {
    try {
      const result = await database.query(
        `SELECT 
          COUNT(*) as total_deals,
          COUNT(CASE WHEN status = 'won' THEN 1 END) as won,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
          ROUND(COUNT(CASE WHEN status = 'won' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
          AVG(amount) as avg_deal_size,
          AVG(EXTRACT(DAY FROM (actual_close_date - created_at))) as avg_days_to_close
         FROM deals
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '6 months'`,
        [userId]
      );

      const data = result.rows[0] || {};

      return {
        totalDeals: parseInt(data.total_deals) || 0,
        won: parseInt(data.won) || 0,
        lost: parseInt(data.lost) || 0,
        winRate: parseFloat(data.win_rate) || 0,
        avgDealSize: Math.round(parseFloat(data.avg_deal_size)) || 0,
        avgDaysToClose: Math.round(parseFloat(data.avg_days_to_close)) || 0,
        stageWinRate: 50 // Placeholder - would calculate per-stage win rate
      };

    } catch (error) {
      logger.warn('Could not fetch historical deal data:', error);
      return {
        totalDeals: 0,
        won: 0,
        lost: 0,
        winRate: 0,
        avgDealSize: 0,
        avgDaysToClose: 0,
        stageWinRate: 0
      };
    }
  }

  /**
   * Store deal insights
   */
  async storeDealInsights(dealId, userId, insights) {
    try {
      // Update deal win probability
      await database.query(
        `UPDATE deals 
         SET win_probability = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [insights.winProbability, dealId, userId]
      );

      // Log insights (if table exists)
      await database.query(
        `INSERT INTO deal_insights (deal_id, user_id, win_probability, insights, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [dealId, userId, insights.winProbability, JSON.stringify(insights)]
      );

    } catch (error) {
      logger.warn('Could not store deal insights:', error.message);
    }
  }

  /**
   * Generate sales forecast for a time period
   * @param {number} userId - User ID
   * @param {Object} params - Forecast parameters
   * @returns {Promise<Object>} Sales forecast with AI insights
   */
  async generateSalesForecast(userId, params = {}) {
    try {
      const { startDate, endDate, groupBy = 'month' } = params;

      // Fetch pipeline data
      const pipelineResult = await database.query(
        `SELECT 
          d.*,
          l.company_name,
          l.industry
         FROM deals d
         LEFT JOIN leads l ON l.id = d.lead_id
         WHERE d.user_id = $1 
           AND d.status NOT IN ('won', 'lost')
           AND (d.expected_close_date IS NULL OR d.expected_close_date BETWEEN $2 AND $3)
         ORDER BY d.amount DESC`,
        [userId, startDate || new Date(), endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)]
      );

      const deals = pipelineResult.rows;

      // Calculate forecast metrics
      const forecast = {
        totalPipelineValue: deals.reduce((sum, d) => sum + (d.amount || 0), 0),
        weightedPipelineValue: deals.reduce((sum, d) => sum + (d.amount || 0) * (d.win_probability || 0) / 100, 0),
        dealCount: deals.length,
        bestCaseScenario: deals.reduce((sum, d) => sum + (d.amount || 0), 0),
        worstCaseScenario: 0,
        likelyScenario: deals.reduce((sum, d) => sum + (d.amount || 0) * (d.win_probability || 0) / 100, 0)
      };

      // Get AI-powered forecast insights
      const aiInsights = await this.analyzeForecastWithAI(deals, forecast);

      return {
        success: true,
        data: {
          ...forecast,
          insights: aiInsights.insights,
          recommendations: aiInsights.recommendations,
          riskFactors: aiInsights.riskFactors,
          topDeals: deals.slice(0, 5).map(d => ({
            id: d.id,
            name: d.deal_name,
            amount: d.amount,
            winProbability: d.win_probability,
            stage: d.stage
          }))
        }
      };

    } catch (error) {
      logger.error('Sales forecast error:', error);
      throw error;
    }
  }

  /**
   * Analyze forecast with AI
   */
  async analyzeForecastWithAI(deals, metrics) {
    try {
      const prompt = `Analyze this sales forecast and provide strategic insights.

FORECAST METRICS:
- Total Pipeline Value: $${metrics.totalPipelineValue.toLocaleString()}
- Weighted Value: $${metrics.weightedPipelineValue.toLocaleString()}
- Number of Deals: ${metrics.dealCount}
- Best Case: $${metrics.bestCaseScenario.toLocaleString()}
- Likely Case: $${metrics.likelyScenario.toLocaleString()}

TOP DEALS:
${deals.slice(0, 10).map(d => `- ${d.deal_name}: $${d.amount} (${d.win_probability}% @ ${d.stage})`).join('\n')}

Provide analysis in this JSON format:
{
  "insights": [
    "Key forecast insight",
    "Pipeline health observation",
    "Trend or pattern"
  ],
  "recommendations": [
    "Strategic recommendation",
    "Action to improve forecast"
  ],
  "riskFactors": [
    "Risk to forecast achievement"
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an expert sales forecasting analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response.trim());

    } catch (error) {
      logger.error('Forecast AI analysis error:', error);
      return {
        insights: ['AI analysis unavailable'],
        recommendations: ['Review forecast manually'],
        riskFactors: ['Unable to assess']
      };
    }
  }
}

module.exports = new AISalesInsights();

