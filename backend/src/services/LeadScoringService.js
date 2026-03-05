const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Lead Scoring Service
 * Manages custom lead scoring rules and score calculation
 */
class LeadScoringService {
  /**
   * Create a scoring rule
   * @param {number} userId - User ID
   * @param {object} ruleData - Rule configuration
   * @returns {object} Created rule
   */
  async createScoringRule(userId, ruleData) {
    try {
      const ruleId = uuidv4();
      
      const query = `
        INSERT INTO lead_scoring_rules (
          id, user_id, company_profile_id, rule_name, rule_type,
          email_opened_points, email_clicked_points, website_visited_points,
          demo_requested_points, pricing_viewed_points,
          company_size_rules, industry_rules, location_rules, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        ruleId,
        userId,
        ruleData.company_profile_id || null,
        ruleData.rule_name,
        ruleData.rule_type || 'behavioral',
        ruleData.email_opened_points || 5,
        ruleData.email_clicked_points || 10,
        ruleData.website_visited_points || 5,
        ruleData.demo_requested_points || 50,
        ruleData.pricing_viewed_points || 20,
        JSON.stringify(ruleData.company_size_rules || {}),
        JSON.stringify(ruleData.industry_rules || {}),
        JSON.stringify(ruleData.location_rules || {}),
        ruleData.is_active !== undefined ? ruleData.is_active : true
      ];

      const result = await database.query(query, values);
      
      logger.info('Scoring rule created', { ruleId, userId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create scoring rule:', error);
      throw error;
    }
  }

  /**
   * Get scoring rules for user
   * @param {number} userId - User ID
   * @returns {array} Scoring rules
   */
  async getScoringRules(userId) {
    try {
      const query = `
        SELECT *
        FROM lead_scoring_rules
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get scoring rules:', error);
      throw error;
    }
  }

  /**
   * Get a specific scoring rule
   * @param {string} ruleId - Rule ID
   * @param {number} userId - User ID
   * @returns {object} Scoring rule
   */
  async getScoringRule(ruleId, userId) {
    try {
      const query = `
        SELECT *
        FROM lead_scoring_rules
        WHERE id = $1 AND user_id = $2
      `;

      const result = await database.query(query, [ruleId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Scoring rule not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get scoring rule:', error);
      throw error;
    }
  }

  /**
   * Update a scoring rule
   * @param {string} ruleId - Rule ID
   * @param {number} userId - User ID
   * @param {object} updates - Rule updates
   * @returns {object} Updated rule
   */
  async updateScoringRule(ruleId, userId, updates) {
    try {
      const sets = [];
      const values = [ruleId, userId];
      let paramCount = 2;

      if (updates.rule_name !== undefined) {
        sets.push(`rule_name = $${++paramCount}`);
        values.push(updates.rule_name);
      }
      if (updates.email_opened_points !== undefined) {
        sets.push(`email_opened_points = $${++paramCount}`);
        values.push(updates.email_opened_points);
      }
      if (updates.email_clicked_points !== undefined) {
        sets.push(`email_clicked_points = $${++paramCount}`);
        values.push(updates.email_clicked_points);
      }
      if (updates.website_visited_points !== undefined) {
        sets.push(`website_visited_points = $${++paramCount}`);
        values.push(updates.website_visited_points);
      }
      if (updates.demo_requested_points !== undefined) {
        sets.push(`demo_requested_points = $${++paramCount}`);
        values.push(updates.demo_requested_points);
      }
      if (updates.pricing_viewed_points !== undefined) {
        sets.push(`pricing_viewed_points = $${++paramCount}`);
        values.push(updates.pricing_viewed_points);
      }
      if (updates.company_size_rules !== undefined) {
        sets.push(`company_size_rules = $${++paramCount}`);
        values.push(JSON.stringify(updates.company_size_rules));
      }
      if (updates.industry_rules !== undefined) {
        sets.push(`industry_rules = $${++paramCount}`);
        values.push(JSON.stringify(updates.industry_rules));
      }
      if (updates.location_rules !== undefined) {
        sets.push(`location_rules = $${++paramCount}`);
        values.push(JSON.stringify(updates.location_rules));
      }
      if (updates.is_active !== undefined) {
        sets.push(`is_active = $${++paramCount}`);
        values.push(updates.is_active);
      }

      if (sets.length === 0) {
        throw new Error('No updates provided');
      }

      sets.push(`updated_at = NOW()`);

      const query = `
        UPDATE lead_scoring_rules
        SET ${sets.join(', ')}
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Scoring rule not found');
      }

      logger.info('Scoring rule updated', { ruleId, userId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update scoring rule:', error);
      throw error;
    }
  }

  /**
   * Delete a scoring rule
   * @param {string} ruleId - Rule ID
   * @param {number} userId - User ID
   * @returns {boolean} Success
   */
  async deleteScoringRule(ruleId, userId) {
    try {
      const query = `
        DELETE FROM lead_scoring_rules
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [ruleId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Scoring rule not found');
      }

      logger.info('Scoring rule deleted', { ruleId, userId });
      
      return true;
    } catch (error) {
      logger.error('Failed to delete scoring rule:', error);
      throw error;
    }
  }

  /**
   * Calculate lead score based on rules
   * @param {string} leadId - Lead ID
   * @param {number} userId - User ID
   * @returns {object} Updated lead with new score
   */
  async calculateLeadScore(leadId, userId) {
    try {
      // Get active scoring rules for user
      const rulesQuery = `
        SELECT *
        FROM lead_scoring_rules
        WHERE user_id = $1 AND is_active = true
      `;
      
      const rulesResult = await database.query(rulesQuery, [userId]);
      const rules = rulesResult.rows;

      if (rules.length === 0) {
        logger.warn('No active scoring rules found', { userId });
        return null;
      }

      // Get lead data
      const leadQuery = `
        SELECT *
        FROM leads
        WHERE id = $1 AND user_id = $2
      `;
      
      const leadResult = await database.query(leadQuery, [leadId, userId]);
      
      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const lead = leadResult.rows[0];
      const oldScore = lead.lead_score || 0;
      let newScore = 0;

      // Calculate score based on each rule
      for (const rule of rules) {
        // Behavioral scoring
        if (rule.rule_type === 'behavioral') {
          // Get email engagement from sales_emails_sent
          const emailQuery = `
            SELECT open_count, click_count
            FROM sales_emails_sent
            WHERE lead_id = $1 AND user_id = $2
          `;
          
          const emailResult = await database.query(emailQuery, [leadId, userId]);
          
          if (emailResult.rows.length > 0) {
            const { open_count, click_count } = emailResult.rows[0];
            newScore += (open_count || 0) * rule.email_opened_points;
            newScore += (click_count || 0) * rule.email_clicked_points;
          }
        }

        // Firmographic scoring
        if (rule.rule_type === 'firmographic') {
          const companySizeRules = rule.company_size_rules || {};
          const industryRules = rule.industry_rules || {};
          const locationRules = rule.location_rules || {};

          // Company size scoring
          if (lead.company_size && companySizeRules[lead.company_size]) {
            newScore += companySizeRules[lead.company_size];
          }

          // Industry scoring
          if (lead.industry && industryRules[lead.industry]) {
            newScore += industryRules[lead.industry];
          }

          // Location scoring
          if (lead.country && locationRules[lead.country]) {
            newScore += locationRules[lead.country];
          }
        }
      }

      // Cap score at 100
      newScore = Math.min(newScore, 100);

      // Update lead score
      const updateQuery = `
        UPDATE leads
        SET lead_score = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;
      
      const updateResult = await database.query(updateQuery, [newScore, leadId, userId]);
      const updatedLead = updateResult.rows[0];

      // Log score change to history
      if (oldScore !== newScore) {
        await this.logScoreChange(leadId, oldScore, newScore, 'Score recalculated based on rules');
      }

      logger.info('Lead score calculated', { leadId, oldScore, newScore });
      
      return updatedLead;
    } catch (error) {
      logger.error('Failed to calculate lead score:', error);
      throw error;
    }
  }

  /**
   * Log score change to history
   * @param {string} leadId - Lead ID
   * @param {number} oldScore - Old score
   * @param {number} newScore - New score
   * @param {string} reason - Reason for change
   */
  async logScoreChange(leadId, oldScore, newScore, reason) {
    try {
      const query = `
        INSERT INTO lead_score_history (lead_id, old_score, new_score, score_change, reason)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await database.query(query, [
        leadId,
        oldScore,
        newScore,
        newScore - oldScore,
        reason
      ]);
    } catch (error) {
      logger.error('Failed to log score change:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get score history for a lead
   * @param {string} leadId - Lead ID
   * @param {number} userId - User ID
   * @returns {array} Score history
   */
  async getScoreHistory(leadId, userId) {
    try {
      // Verify lead belongs to user
      const verifyQuery = `
        SELECT id FROM leads WHERE id = $1 AND user_id = $2
      `;
      
      const verifyResult = await database.query(verifyQuery, [leadId, userId]);
      
      if (verifyResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const query = `
        SELECT *
        FROM lead_score_history
        WHERE lead_id = $1
        ORDER BY created_at DESC
      `;

      const result = await database.query(query, [leadId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get score history:', error);
      throw error;
    }
  }

  /**
   * Apply behavioral score (called when action occurs)
   * @param {string} leadId - Lead ID
   * @param {string} action - Action type
   * @param {number} points - Points to add
   * @param {string} reason - Reason for score change
   */
  async applyBehavioralScore(leadId, action, points, reason) {
    try {
      // Get current score
      const leadQuery = `
        SELECT lead_score, user_id FROM leads WHERE id = $1
      `;
      
      const leadResult = await database.query(leadQuery, [leadId]);
      
      if (leadResult.rows.length === 0) {
        throw new Error('Lead not found');
      }

      const { lead_score, user_id } = leadResult.rows[0];
      const oldScore = lead_score || 0;
      const newScore = Math.min(oldScore + points, 100);

      // Update score
      const updateQuery = `
        UPDATE leads
        SET lead_score = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await database.query(updateQuery, [newScore, leadId]);
      
      // Log score change
      await this.logScoreChange(leadId, oldScore, newScore, reason);

      logger.info('Behavioral score applied', { leadId, action, points, oldScore, newScore });
      
      return updateResult.rows[0];
    } catch (error) {
      logger.error('Failed to apply behavioral score:', error);
      throw error;
    }
  }
}

module.exports = new LeadScoringService();

