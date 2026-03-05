const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class PipelineService {
  /**
   * Create a new deal
   */
  async createDeal(userId, dealData, createdBy = null) {
    try {
      const dealId = uuidv4();
      
      const query = `
        INSERT INTO deals (
          id, user_id, company_profile_id, lead_id, deal_name, description,
          amount, currency, pipeline, stage, win_probability, expected_close_date,
          source, contact_name, contact_email, company_name, assigned_to,
          custom_fields, tags, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;
      
      const values = [
        dealId,
        userId,
        dealData.company_profile_id || null,
        dealData.lead_id || null,
        dealData.deal_name,
        dealData.description || null,
        dealData.amount || 0,
        dealData.currency || 'USD',
        dealData.pipeline || 'default',
        dealData.stage || 'qualified',
        dealData.win_probability || 50,
        dealData.expected_close_date || null,
        dealData.source || 'inbound',
        dealData.contact_name || null,
        dealData.contact_email || null,
        dealData.company_name || null,
        dealData.assigned_to || null,
        JSON.stringify(dealData.custom_fields || {}),
        dealData.tags || [],
        dealData.notes || null,
        createdBy || userId
      ];
      
      const result = await database.query(query, values);
      const deal = result.rows[0];
      
      logger.info('Deal created successfully', { dealId, userId, stage: dealData.stage });
      
      return deal;
    } catch (error) {
      logger.error('Failed to create deal:', error);
      throw error;
    }
  }

  /**
   * Get deal by ID
   */
  async getDealById(dealId, userId) {
    try {
      const query = `
        SELECT d.*,
          u.username as assigned_to_name,
          l.first_name || ' ' || l.last_name as lead_name,
          l.email as lead_email,
          (SELECT COUNT(*) FROM activities WHERE deal_id = d.id) as activity_count
        FROM deals d
        LEFT JOIN users u ON d.assigned_to = u.id
        LEFT JOIN leads l ON d.lead_id = l.id
        WHERE d.id = $1 AND d.user_id = $2
      `;
      
      const result = await database.query(query, [dealId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get deal:', error);
      throw error;
    }
  }

  /**
   * Get all deals for a user with filters
   */
  async getDeals(userId, filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT d.*,
          u.username as assigned_to_name,
          (SELECT COUNT(*) FROM activities WHERE deal_id = d.id) as activity_count
        FROM deals d
        LEFT JOIN users u ON d.assigned_to = u.id
        WHERE d.user_id = $1
      `;
      
      const queryParams = [userId];
      let paramCounter = 2;
      
      // Apply filters
      if (filters.pipeline) {
        query += ` AND d.pipeline = $${paramCounter}`;
        queryParams.push(filters.pipeline);
        paramCounter++;
      }
      
      if (filters.stage) {
        query += ` AND d.stage = $${paramCounter}`;
        queryParams.push(filters.stage);
        paramCounter++;
      }
      
      if (filters.status) {
        query += ` AND d.status = $${paramCounter}`;
        queryParams.push(filters.status);
        paramCounter++;
      }
      
      if (filters.assigned_to) {
        query += ` AND d.assigned_to = $${paramCounter}`;
        queryParams.push(filters.assigned_to);
        paramCounter++;
      }
      
      if (filters.min_amount) {
        query += ` AND d.amount >= $${paramCounter}`;
        queryParams.push(filters.min_amount);
        paramCounter++;
      }
      
      if (filters.max_amount) {
        query += ` AND d.amount <= $${paramCounter}`;
        queryParams.push(filters.max_amount);
        paramCounter++;
      }
      
      if (filters.expected_close_before) {
        query += ` AND d.expected_close_date <= $${paramCounter}`;
        queryParams.push(filters.expected_close_before);
        paramCounter++;
      }
      
      if (filters.search) {
        query += ` AND (
          d.deal_name ILIKE $${paramCounter} OR 
          d.contact_name ILIKE $${paramCounter} OR 
          d.company_name ILIKE $${paramCounter}
        )`;
        queryParams.push(`%${filters.search}%`);
        paramCounter++;
      }
      
      // Get total count
      const countQuery = query.replace(/SELECT d\.\*.*FROM/s, 'SELECT COUNT(*) FROM');
      const countResult = await database.query(countQuery, queryParams.slice(0, paramCounter - 1));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Order and paginate
      query += ` ORDER BY d.${filters.sort_by || 'created_at'} ${filters.sort_order || 'DESC'}`;
      query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      queryParams.push(limit, offset);
      
      const result = await database.query(query, queryParams);
      
      return {
        deals: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get deals:', error);
      throw error;
    }
  }

  /**
   * Get pipeline view (grouped by stage)
   */
  async getPipelineView(userId, pipeline = 'default') {
    try {
      const query = `
        SELECT 
          d.stage,
          COUNT(*) as deal_count,
          SUM(d.amount) as total_value,
          SUM(d.expected_value) as expected_value,
          AVG(d.win_probability) as avg_win_probability,
          json_agg(
            json_build_object(
              'id', d.id,
              'deal_name', d.deal_name,
              'amount', d.amount,
              'expected_value', d.expected_value,
              'win_probability', d.win_probability,
              'company_name', d.company_name,
              'contact_name', d.contact_name,
              'expected_close_date', d.expected_close_date,
              'assigned_to', d.assigned_to,
              'assigned_to_name', u.username,
              'created_at', d.created_at
            ) ORDER BY d.created_at DESC
          ) as deals
        FROM deals d
        LEFT JOIN users u ON d.assigned_to = u.id
        WHERE d.user_id = $1 AND d.pipeline = $2 AND d.status = 'open'
        GROUP BY d.stage
        ORDER BY 
          CASE d.stage
            WHEN 'lead' THEN 1
            WHEN 'qualified' THEN 2
            WHEN 'meeting' THEN 3
            WHEN 'proposal' THEN 4
            WHEN 'negotiation' THEN 5
            ELSE 6
          END
      `;
      
      const result = await database.query(query, [userId, pipeline]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get pipeline view:', error);
      throw error;
    }
  }

  /**
   * Update deal
   */
  async updateDeal(dealId, userId, updates) {
    try {
      // Build dynamic UPDATE query
      const allowedFields = [
        'deal_name', 'description', 'amount', 'currency', 'pipeline', 'stage',
        'win_probability', 'expected_close_date', 'actual_close_date', 'status',
        'close_reason', 'source', 'contact_name', 'contact_email', 'company_name',
        'assigned_to', 'next_follow_up_date', 'custom_fields', 'tags', 'notes'
      ];
      
      const updateFields = [];
      const values = [];
      let paramCounter = 1;
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCounter}`);
          
          // Handle JSON fields
          if (key === 'custom_fields') {
            values.push(JSON.stringify(updates[key]));
          } else {
            values.push(updates[key]);
          }
          paramCounter++;
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      values.push(dealId, userId);
      
      const query = `
        UPDATE deals 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCounter} AND user_id = $${paramCounter + 1}
        RETURNING *
      `;
      
      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Deal not found or unauthorized');
      }
      
      logger.info('Deal updated successfully', { dealId, userId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update deal:', error);
      throw error;
    }
  }

  /**
   * Move deal to different stage
   */
  async moveDealToStage(dealId, userId, newStage, updateData = {}) {
    try {
      // Get current deal
      const deal = await this.getDealById(dealId, userId);
      
      if (!deal) {
        throw new Error('Deal not found');
      }
      
      // Update stage and any additional data
      const updates = {
        stage: newStage,
        ...updateData
      };
      
      // Auto-update win probability based on stage
      if (!updateData.win_probability) {
        const stageWinProbabilities = {
          'lead': 10,
          'qualified': 25,
          'meeting': 40,
          'proposal': 60,
          'negotiation': 80,
          'closed_won': 100,
          'closed_lost': 0
        };
        updates.win_probability = stageWinProbabilities[newStage] || deal.win_probability;
      }
      
      // If moving to closed stages, update status
      if (newStage === 'closed_won') {
        updates.status = 'won';
        updates.actual_close_date = new Date();
      } else if (newStage === 'closed_lost') {
        updates.status = 'lost';
        updates.actual_close_date = new Date();
      }
      
      const updatedDeal = await this.updateDeal(dealId, userId, updates);
      
      logger.info('Deal moved to new stage', { dealId, fromStage: deal.stage, toStage: newStage });
      
      return updatedDeal;
    } catch (error) {
      logger.error('Failed to move deal to stage:', error);
      throw error;
    }
  }

  /**
   * Close deal as won
   */
  async closeDealWon(dealId, userId, closeData = {}) {
    try {
      const updates = {
        stage: 'closed_won',
        status: 'won',
        actual_close_date: new Date(),
        win_probability: 100,
        close_reason: closeData.close_reason || 'Deal closed successfully',
        ...closeData
      };
      
      const deal = await this.updateDeal(dealId, userId, updates);
      
      logger.info('Deal closed as won', { dealId, userId });
      
      return deal;
    } catch (error) {
      logger.error('Failed to close deal as won:', error);
      throw error;
    }
  }

  /**
   * Close deal as lost
   */
  async closeDealLost(dealId, userId, closeData = {}) {
    try {
      const updates = {
        stage: 'closed_lost',
        status: 'lost',
        actual_close_date: new Date(),
        win_probability: 0,
        close_reason: closeData.close_reason || 'Deal lost',
        ...closeData
      };
      
      const deal = await this.updateDeal(dealId, userId, updates);
      
      logger.info('Deal closed as lost', { dealId, userId, reason: closeData.close_reason });
      
      return deal;
    } catch (error) {
      logger.error('Failed to close deal as lost:', error);
      throw error;
    }
  }

  /**
   * Delete deal
   */
  async deleteDeal(dealId, userId) {
    try {
      const query = `
        DELETE FROM deals 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await database.query(query, [dealId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Deal not found or unauthorized');
      }
      
      logger.info('Deal deleted successfully', { dealId, userId });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete deal:', error);
      throw error;
    }
  }

  /**
   * Get deal stage history
   */
  async getDealStageHistory(dealId, userId) {
    try {
      // Verify deal ownership
      const deal = await this.getDealById(dealId, userId);
      
      if (!deal) {
        throw new Error('Deal not found or unauthorized');
      }
      
      const query = `
        SELECT dsh.*, u.username as changed_by_name
        FROM deal_stage_history dsh
        LEFT JOIN users u ON dsh.changed_by = u.id
        WHERE dsh.deal_id = $1
        ORDER BY dsh.changed_at ASC
      `;
      
      const result = await database.query(query, [dealId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get deal stage history:', error);
      throw error;
    }
  }

  /**
   * Get deal statistics
   */
  async getDealStats(userId, dateRange = null) {
    try {
      let dateFilter = '';
      const params = [userId];
      
      if (dateRange) {
        dateFilter = `AND created_at >= $2 AND created_at <= $3`;
        params.push(dateRange.start, dateRange.end);
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_deals,
          COUNT(*) FILTER (WHERE status = 'open') as open_deals,
          COUNT(*) FILTER (WHERE status = 'won') as won_deals,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_deals,
          SUM(amount) FILTER (WHERE status = 'open') as pipeline_value,
          SUM(amount) FILTER (WHERE status = 'won') as won_value,
          SUM(expected_value) FILTER (WHERE status = 'open') as expected_value,
          AVG(win_probability) FILTER (WHERE status = 'open') as avg_win_probability,
          ROUND(
            COUNT(*) FILTER (WHERE status = 'won')::numeric / 
            NULLIF(COUNT(*) FILTER (WHERE status IN ('won', 'lost')), 0)::numeric * 100,
            2
          ) as win_rate
        FROM deals
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const result = await database.query(query, params);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get deal stats:', error);
      throw error;
    }
  }

  /**
   * Get sales forecast
   */
  async getSalesForecast(userId, months = 3) {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('month', expected_close_date) as month,
          COUNT(*) as deal_count,
          SUM(amount) as potential_value,
          SUM(expected_value) as forecasted_value,
          AVG(win_probability) as avg_win_probability
        FROM deals
        WHERE user_id = $1 
          AND status = 'open'
          AND expected_close_date IS NOT NULL
          AND expected_close_date >= CURRENT_DATE
          AND expected_close_date <= CURRENT_DATE + INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', expected_close_date)
        ORDER BY month ASC
      `;
      
      const result = await database.query(query, [userId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get sales forecast:', error);
      throw error;
    }
  }

  /**
   * Get pipeline stages (customizable)
   */
  async getPipelineStages(userId, pipelineName = 'default') {
    try {
      const query = `
        SELECT * FROM pipeline_stages
        WHERE user_id = $1 AND pipeline_name = $2 AND is_active = true
        ORDER BY stage_order ASC
      `;
      
      const result = await database.query(query, [userId, pipelineName]);
      
      // If no custom stages, return default stages
      if (result.rows.length === 0) {
        return this.getDefaultPipelineStages();
      }
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get pipeline stages:', error);
      throw error;
    }
  }

  /**
   * Get default pipeline stages
   */
  getDefaultPipelineStages() {
    return [
      { stage_name: 'lead', stage_order: 1, default_win_probability: 10, stage_color: '#E0E0E0' },
      { stage_name: 'qualified', stage_order: 2, default_win_probability: 25, stage_color: '#90CAF9' },
      { stage_name: 'meeting', stage_order: 3, default_win_probability: 40, stage_color: '#64B5F6' },
      { stage_name: 'proposal', stage_order: 4, default_win_probability: 60, stage_color: '#42A5F5' },
      { stage_name: 'negotiation', stage_order: 5, default_win_probability: 80, stage_color: '#1E88E5' },
      { stage_name: 'closed_won', stage_order: 6, default_win_probability: 100, stage_color: '#4CAF50' },
      { stage_name: 'closed_lost', stage_order: 7, default_win_probability: 0, stage_color: '#F44336' }
    ];
  }

  /**
   * Create custom pipeline stage
   */
  async createPipelineStage(userId, stageData) {
    try {
      const query = `
        INSERT INTO pipeline_stages (
          id, user_id, company_profile_id, pipeline_name, stage_name,
          stage_order, default_win_probability, stage_color
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        userId,
        stageData.company_profile_id || null,
        stageData.pipeline_name || 'default',
        stageData.stage_name,
        stageData.stage_order,
        stageData.default_win_probability || 50,
        stageData.stage_color || '#2196F3'
      ];
      
      const result = await database.query(query, values);
      
      logger.info('Pipeline stage created', { userId, stageName: stageData.stage_name });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create pipeline stage:', error);
      throw error;
    }
  }
}

module.exports = new PipelineService();

