const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class LeadManagementService {
  /**
   * Create a new lead
   */
  async createLead(userId, leadData, createdBy = null) {
    try {
      const leadId = uuidv4();
      
      const query = `
        INSERT INTO leads (
          id, user_id, company_profile_id, first_name, last_name, email, phone,
          company_name, job_title, linkedin_url, twitter_handle, website_url,
          source, source_details, status, stage, company_size, industry,
          location, country, custom_fields, tags, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;
      
      const values = [
        leadId,
        userId,
        leadData.company_profile_id || null,
        leadData.first_name || null,
        leadData.last_name || null,
        leadData.email || null,
        leadData.phone || null,
        leadData.company_name || null,
        leadData.job_title || null,
        leadData.linkedin_url || null,
        leadData.twitter_handle || null,
        leadData.website_url || null,
        leadData.source || 'manual',
        JSON.stringify(leadData.source_details || {}),
        leadData.status || 'new',
        leadData.stage || 'lead',
        leadData.company_size || null,
        leadData.industry || null,
        leadData.location || null,
        leadData.country || null,
        JSON.stringify(leadData.custom_fields || {}),
        leadData.tags || [],
        leadData.notes || null,
        createdBy || userId
      ];
      
      const result = await database.query(query, values);
      const lead = result.rows[0];
      
      logger.info('Lead created successfully', { leadId, userId, source: leadData.source });
      
      // Auto-calculate lead score
      await this.calculateLeadScore(leadId);
      
      // Auto-enrich lead data (async, don't wait)
      this.enrichLead(leadId).catch(err => 
        logger.warn('Lead enrichment failed', { leadId, error: err.message })
      );
      
      return lead;
    } catch (error) {
      logger.error('Failed to create lead:', error);
      throw error;
    }
  }

  /**
   * Get lead by ID
   */
  async getLeadById(leadId, userId) {
    try {
      const query = `
        SELECT l.*,
          u.username as assigned_to_name,
          (SELECT COUNT(*) FROM activities WHERE lead_id = l.id) as activity_count,
          (SELECT COUNT(*) FROM lead_notes WHERE lead_id = l.id) as note_count
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.id = $1 AND l.user_id = $2
      `;
      
      const result = await database.query(query, [leadId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get lead:', error);
      throw error;
    }
  }

  /**
   * Get all leads for a user with filters and pagination
   */
  async getLeads(userId, filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT l.*,
          u.username as assigned_to_name,
          (SELECT COUNT(*) FROM activities WHERE lead_id = l.id) as activity_count
        FROM leads l
        LEFT JOIN users u ON l.assigned_to = u.id
        WHERE l.user_id = $1
      `;
      
      const queryParams = [userId];
      let paramCounter = 2;
      
      // Apply filters
      if (filters.status) {
        query += ` AND l.status = $${paramCounter}`;
        queryParams.push(filters.status);
        paramCounter++;
      }
      
      if (filters.stage) {
        query += ` AND l.stage = $${paramCounter}`;
        queryParams.push(filters.stage);
        paramCounter++;
      }
      
      if (filters.source) {
        query += ` AND l.source = $${paramCounter}`;
        queryParams.push(filters.source);
        paramCounter++;
      }
      
      if (filters.is_qualified !== undefined) {
        query += ` AND l.is_qualified = $${paramCounter}`;
        queryParams.push(filters.is_qualified);
        paramCounter++;
      }
      
      if (filters.assigned_to) {
        query += ` AND l.assigned_to = $${paramCounter}`;
        queryParams.push(filters.assigned_to);
        paramCounter++;
      }
      
      if (filters.min_score) {
        query += ` AND l.lead_score >= $${paramCounter}`;
        queryParams.push(filters.min_score);
        paramCounter++;
      }
      
      if (filters.search) {
        query += ` AND (
          l.first_name ILIKE $${paramCounter} OR 
          l.last_name ILIKE $${paramCounter} OR 
          l.email ILIKE $${paramCounter} OR 
          l.company_name ILIKE $${paramCounter}
        )`;
        queryParams.push(`%${filters.search}%`);
        paramCounter++;
      }
      
      // Get total count
      const countQuery = query.replace(/SELECT l\.\*.*FROM/s, 'SELECT COUNT(*) FROM');
      const countResult = await database.query(countQuery, queryParams.slice(0, paramCounter - 1));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Order and paginate
      query += ` ORDER BY l.${filters.sort_by || 'created_at'} ${filters.sort_order || 'DESC'}`;
      query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      queryParams.push(limit, offset);
      
      const result = await database.query(query, queryParams);
      
      return {
        leads: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get leads:', error);
      throw error;
    }
  }

  /**
   * Update lead
   */
  async updateLead(leadId, userId, updates) {
    try {
      // Build dynamic UPDATE query
      const allowedFields = [
        'first_name', 'last_name', 'email', 'phone', 'company_name', 'job_title',
        'linkedin_url', 'twitter_handle', 'website_url', 'status', 'stage',
        'is_qualified', 'qualification_notes', 'has_budget', 'has_authority',
        'has_need', 'timeline', 'company_size', 'industry', 'location', 'country',
        'assigned_to', 'custom_fields', 'tags', 'notes'
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
      
      values.push(leadId, userId);
      
      const query = `
        UPDATE leads 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCounter} AND user_id = $${paramCounter + 1}
        RETURNING *
      `;
      
      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Lead not found or unauthorized');
      }
      
      const lead = result.rows[0];
      
      // Recalculate lead score if relevant fields changed
      if (updates.status || updates.stage || updates.is_qualified) {
        await this.calculateLeadScore(leadId);
      }
      
      logger.info('Lead updated successfully', { leadId, userId });
      
      return lead;
    } catch (error) {
      logger.error('Failed to update lead:', error);
      throw error;
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId, userId) {
    try {
      const query = `
        DELETE FROM leads 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await database.query(query, [leadId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Lead not found or unauthorized');
      }
      
      logger.info('Lead deleted successfully', { leadId, userId });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete lead:', error);
      throw error;
    }
  }

  /**
   * Assign lead to user
   */
  async assignLead(leadId, userId, assignToUserId) {
    try {
      const query = `
        UPDATE leads 
        SET assigned_to = $1, assigned_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;
      
      const result = await database.query(query, [assignToUserId, leadId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Lead not found or unauthorized');
      }
      
      logger.info('Lead assigned successfully', { leadId, assignToUserId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to assign lead:', error);
      throw error;
    }
  }

  /**
   * Qualify lead
   */
  async qualifyLead(leadId, userId, qualificationData) {
    try {
      const query = `
        UPDATE leads 
        SET 
          is_qualified = true,
          qualified_at = NOW(),
          qualification_notes = $1,
          has_budget = $2,
          has_authority = $3,
          has_need = $4,
          timeline = $5,
          stage = 'sql',
          status = 'qualified'
        WHERE id = $6 AND user_id = $7
        RETURNING *
      `;
      
      const values = [
        qualificationData.notes || null,
        qualificationData.has_budget || false,
        qualificationData.has_authority || false,
        qualificationData.has_need || false,
        qualificationData.timeline || null,
        leadId,
        userId
      ];
      
      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Lead not found or unauthorized');
      }
      
      // Recalculate score
      await this.calculateLeadScore(leadId);
      
      logger.info('Lead qualified successfully', { leadId, userId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to qualify lead:', error);
      throw error;
    }
  }

  /**
   * Convert lead to deal
   */
  async convertLead(leadId, userId, dealData) {
    try {
      // Get lead details
      const lead = await this.getLeadById(leadId, userId);
      
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      // Create deal (will use PipelineService, but for now inline)
      const PipelineService = require('./PipelineService');
      const deal = await PipelineService.createDeal(userId, {
        lead_id: leadId,
        deal_name: dealData.deal_name || `${lead.company_name || lead.first_name} - Deal`,
        amount: dealData.amount || 0,
        stage: dealData.stage || 'qualified',
        contact_name: `${lead.first_name} ${lead.last_name}`,
        contact_email: lead.email,
        company_name: lead.company_name,
        assigned_to: lead.assigned_to,
        ...dealData
      });
      
      // Update lead status
      await this.updateLead(leadId, userId, {
        status: 'converted',
        converted_at: new Date()
      });
      
      logger.info('Lead converted to deal successfully', { leadId, dealId: deal.id });
      
      return { lead, deal };
    } catch (error) {
      logger.error('Failed to convert lead:', error);
      throw error;
    }
  }

  /**
   * Calculate lead score
   */
  async calculateLeadScore(leadId) {
    try {
      const lead = await database.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      
      if (lead.rows.length === 0) {
        return;
      }
      
      const leadData = lead.rows[0];
      
      // Behavioral scoring (0-40 points)
      let behavioralScore = 0;
      behavioralScore += Math.min(leadData.website_visits * 2, 10); // Max 10 points
      behavioralScore += Math.min(leadData.email_opens * 1, 10); // Max 10 points
      behavioralScore += Math.min(leadData.email_clicks * 2, 10); // Max 10 points
      behavioralScore += Math.min(leadData.social_interactions * 1, 5); // Max 5 points
      behavioralScore += Math.min(leadData.content_downloads * 5, 5); // Max 5 points
      
      // Firmographic scoring (0-30 points)
      let firmographicScore = 0;
      
      // Company size scoring
      const companySizeScores = {
        'solo': 5,
        '2-10': 10,
        '11-50': 15,
        '51-200': 20,
        '201-500': 25,
        '500+': 30
      };
      firmographicScore += companySizeScores[leadData.company_size] || 0;
      
      // Intent scoring (0-30 points)
      let intentScore = 0;
      
      // Qualification status
      if (leadData.is_qualified) {
        intentScore += 15;
      }
      
      // BANT scoring
      if (leadData.has_budget) intentScore += 5;
      if (leadData.has_authority) intentScore += 5;
      if (leadData.has_need) intentScore += 5;
      
      // Timeline scoring
      const timelineScores = {
        'immediate': 10,
        '1-3_months': 7,
        '3-6_months': 5,
        '6-12_months': 3,
        'no_timeline': 0
      };
      intentScore += timelineScores[leadData.timeline] || 0;
      
      // Total score (0-100)
      const totalScore = Math.min(behavioralScore + firmographicScore + intentScore, 100);
      
      // Update lead with scores
      await database.query(`
        UPDATE leads 
        SET 
          behavioral_score = $1,
          firmographic_score = $2,
          intent_score = $3,
          lead_score = $4,
          qualification_score = $4
        WHERE id = $5
      `, [behavioralScore, firmographicScore, intentScore, totalScore, leadId]);
      
      logger.debug('Lead score calculated', { leadId, totalScore });
      
      return totalScore;
    } catch (error) {
      logger.error('Failed to calculate lead score:', error);
      throw error;
    }
  }

  /**
   * Enrich lead data from external sources
   */
  async enrichLead(leadId) {
    try {
      // TODO: Integrate with enrichment services like Clearbit, ZoomInfo, etc.
      // For now, placeholder
      logger.debug('Lead enrichment placeholder', { leadId });
      
      return { success: true, message: 'Enrichment not implemented yet' };
    } catch (error) {
      logger.error('Failed to enrich lead:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate leads
   */
  async findDuplicates(userId, email, phone = null) {
    try {
      let query = `
        SELECT * FROM leads 
        WHERE user_id = $1 AND (email = $2
      `;
      
      const params = [userId, email];
      
      if (phone) {
        query += ` OR phone = $3`;
        params.push(phone);
      }
      
      query += `)`;
      
      const result = await database.query(query, params);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to find duplicate leads:', error);
      throw error;
    }
  }

  /**
   * Merge duplicate leads
   */
  async mergeLeads(userId, primaryLeadId, duplicateLeadIds) {
    try {
      // Get primary lead
      const primaryLead = await this.getLeadById(primaryLeadId, userId);
      
      if (!primaryLead) {
        throw new Error('Primary lead not found');
      }
      
      // For each duplicate, merge data and activities
      for (const duplicateId of duplicateLeadIds) {
        // Move activities to primary lead
        await database.query(`
          UPDATE activities 
          SET lead_id = $1 
          WHERE lead_id = $2
        `, [primaryLeadId, duplicateId]);
        
        // Move notes to primary lead
        await database.query(`
          UPDATE lead_notes 
          SET lead_id = $1 
          WHERE lead_id = $2
        `, [primaryLeadId, duplicateId]);
        
        // Delete duplicate lead
        await this.deleteLead(duplicateId, userId);
      }
      
      logger.info('Leads merged successfully', { primaryLeadId, duplicateCount: duplicateLeadIds.length });
      
      return primaryLead;
    } catch (error) {
      logger.error('Failed to merge leads:', error);
      throw error;
    }
  }

  /**
   * Bulk import leads
   */
  async bulkImportLeads(userId, leadsData, source = 'import') {
    try {
      const results = {
        success: [],
        failed: [],
        duplicates: []
      };
      
      for (const leadData of leadsData) {
        try {
          // Check for duplicates
          if (leadData.email) {
            const duplicates = await this.findDuplicates(userId, leadData.email, leadData.phone);
            
            if (duplicates.length > 0) {
              results.duplicates.push({
                data: leadData,
                existingLeadId: duplicates[0].id
              });
              continue;
            }
          }
          
          // Create lead
          const lead = await this.createLead(userId, {
            ...leadData,
            source
          });
          
          results.success.push(lead);
        } catch (error) {
          results.failed.push({
            data: leadData,
            error: error.message
          });
        }
      }
      
      logger.info('Bulk import completed', {
        userId,
        success: results.success.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length
      });
      
      return results;
    } catch (error) {
      logger.error('Failed to bulk import leads:', error);
      throw error;
    }
  }

  /**
   * Get lead statistics
   */
  async getLeadStats(userId, dateRange = null) {
    try {
      let dateFilter = '';
      const params = [userId];
      
      if (dateRange) {
        dateFilter = `AND created_at >= $2 AND created_at <= $3`;
        params.push(dateRange.start, dateRange.end);
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE status = 'new') as new_leads,
          COUNT(*) FILTER (WHERE status = 'contacted') as contacted_leads,
          COUNT(*) FILTER (WHERE is_qualified = true) as qualified_leads,
          COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_leads,
          AVG(lead_score) as avg_lead_score,
          COUNT(DISTINCT source) as unique_sources
        FROM leads
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const result = await database.query(query, params);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get lead stats:', error);
      throw error;
    }
  }
}

module.exports = new LeadManagementService();

