/**
 * Visitor Intelligence Service
 * Tracks website visitors and converts them to leads
 */

const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const LeadManagementService = require('./LeadManagementService');

class VisitorIntelligenceService {
  /**
   * Track a visitor (create or update)
   */
  async trackVisitor(userId, visitorData) {
    try {
      const {
        visitor_id,
        ip_address,
        user_agent,
        referrer_url,
        company_domain,
        email,
        first_name,
        last_name
      } = visitorData;

      // Check if visitor exists
      const existing = await database.query(
        'SELECT * FROM website_visitors WHERE visitor_id = $1 AND user_id = $2',
        [visitor_id, userId]
      );

      let visitor;
      if (existing.rows.length > 0) {
        // Update existing visitor
        visitor = existing.rows[0];
        await database.query(
          `UPDATE website_visitors
           SET last_visit_at = NOW(),
               total_visits = total_visits + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [visitor.id]
        );
      } else {
        // Create new visitor
        const visitorId = uuidv4();
        const query = `
          INSERT INTO website_visitors (
            id, user_id, visitor_id, ip_address, user_agent, referrer_url,
            company_domain, email, first_name, last_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        const result = await database.query(query, [
          visitorId,
          userId,
          visitor_id,
          ip_address,
          user_agent,
          referrer_url,
          company_domain,
          email,
          first_name,
          last_name
        ]);

        visitor = result.rows[0];

        // Enrich visitor data if domain provided
        if (company_domain) {
          this.enrichVisitorData(visitor.id).catch(err =>
            logger.warn('Visitor enrichment failed', { visitorId: visitor.id, error: err.message })
          );
        }
      }

      // Calculate and update scores
      await this.calculateVisitorScores(visitor.id);

      return visitor;
    } catch (error) {
      logger.error('Failed to track visitor:', error);
      throw error;
    }
  }

  /**
   * Create or update session
   */
  async trackSession(userId, visitorId, sessionData) {
    try {
      const {
        session_id,
        device_type,
        browser,
        os,
        country,
        city,
        source,
        medium,
        campaign,
        keyword,
        entry_page
      } = sessionData;

      // Check if session exists
      const existing = await database.query(
        'SELECT * FROM visitor_sessions WHERE session_id = $1',
        [session_id]
      );

      let session;
      if (existing.rows.length > 0) {
        session = existing.rows[0];
      } else {
        // Create new session
        const sessionUuid = uuidv4();
        const query = `
          INSERT INTO visitor_sessions (
            id, visitor_id, user_id, session_id,
            device_type, browser, os, country, city,
            source, medium, campaign, keyword, entry_page
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        const result = await database.query(query, [
          sessionUuid,
          visitorId,
          userId,
          session_id,
          device_type,
          browser,
          os,
          country,
          city,
          source,
          medium,
          campaign,
          keyword,
          entry_page
        ]);

        session = result.rows[0];
      }

      return session;
    } catch (error) {
      logger.error('Failed to track session:', error);
      throw error;
    }
  }

  /**
   * Track page view
   */
  async trackPageView(userId, visitorId, sessionId, pageData) {
    try {
      const {
        page_url,
        page_title,
        page_path,
        time_on_page,
        scroll_depth,
        viewed_pricing,
        viewed_demo,
        viewed_case_studies
      } = pageData;

      const pageViewId = uuidv4();
      const query = `
        INSERT INTO visitor_page_views (
          id, visitor_id, session_id, user_id,
          page_url, page_title, page_path,
          time_on_page, scroll_depth,
          viewed_pricing, viewed_demo, viewed_case_studies,
          engaged
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const engaged = time_on_page > 30 && scroll_depth > 50;

      const result = await database.query(query, [
        pageViewId,
        visitorId,
        sessionId,
        userId,
        page_url,
        page_title,
        page_path,
        time_on_page,
        scroll_depth,
        viewed_pricing || false,
        viewed_demo || false,
        viewed_case_studies || false,
        engaged
      ]);

      // Recalculate scores after page view
      await this.calculateVisitorScores(visitorId);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to track page view:', error);
      throw error;
    }
  }

  /**
   * Track event
   */
  async trackEvent(userId, visitorId, sessionId, eventData) {
    try {
      const {
        event_type,
        event_name,
        event_value,
        event_data = {},
        page_url,
        page_title
      } = eventData;

      const eventId = uuidv4();
      const query = `
        INSERT INTO visitor_events (
          id, visitor_id, session_id, user_id,
          event_type, event_name, event_value,
          event_data, page_url, page_title
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await database.query(query, [
        eventId,
        visitorId,
        sessionId,
        userId,
        event_type,
        event_name,
        event_value,
        JSON.stringify(event_data),
        page_url,
        page_title
      ]);

      // Recalculate scores after event
      await this.calculateVisitorScores(visitorId);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to track event:', error);
      throw error;
    }
  }

  /**
   * Calculate visitor scores
   */
  async calculateVisitorScores(visitorId) {
    try {
      const visitor = await database.query(
        'SELECT * FROM website_visitors WHERE id = $1',
        [visitorId]
      );

      if (visitor.rows.length === 0) {
        return;
      }

      const v = visitor.rows[0];

      // Calculate Intent Score (0-100)
      const intentScore = await this.calculateIntentScore(visitorId);

      // Calculate Engagement Score (0-100)
      const engagementScore = await this.calculateEngagementScore(visitorId);

      // Calculate Overall Visitor Score (weighted average)
      const visitorScore = Math.round(
        (intentScore * 0.4) + (engagementScore * 0.6)
      );

      // Update visitor scores
      await database.query(
        `UPDATE website_visitors
         SET visitor_score = $1,
             intent_score = $2,
             engagement_score = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [visitorScore, intentScore, engagementScore, visitorId]
      );

      // Auto-convert high-scoring visitors
      if (visitorScore >= 70 && !v.converted_to_lead) {
        this.convertVisitorToLead(visitorId, v.user_id, 'auto').catch(err =>
          logger.warn('Auto-conversion failed', { visitorId, error: err.message })
        );
      }
    } catch (error) {
      logger.error('Failed to calculate visitor scores:', error);
      throw error;
    }
  }

  /**
   * Calculate intent score based on pages viewed
   */
  async calculateIntentScore(visitorId) {
    try {
      const pageViews = await database.query(
        `SELECT 
          COUNT(*) as total_views,
          COUNT(CASE WHEN viewed_pricing THEN 1 END) as pricing_views,
          COUNT(CASE WHEN viewed_demo THEN 1 END) as demo_views,
          COUNT(CASE WHEN viewed_case_studies THEN 1 END) as case_study_views,
          COUNT(CASE WHEN page_path LIKE '%contact%' OR page_path LIKE '%get-started%' THEN 1 END) as contact_views
        FROM visitor_page_views
        WHERE visitor_id = $1`,
        [visitorId]
      );

      if (pageViews.rows.length === 0) {
        return 0;
      }

      const pv = pageViews.rows[0];
      let score = 0;

      // Base score from total views
      score += Math.min(parseInt(pv.total_views) * 5, 30);

      // Intent signals
      if (parseInt(pv.pricing_views) > 0) score += 25;
      if (parseInt(pv.demo_views) > 0) score += 30;
      if (parseInt(pv.case_study_views) > 0) score += 15;
      if (parseInt(pv.contact_views) > 0) score += 20;

      return Math.min(score, 100);
    } catch (error) {
      logger.error('Failed to calculate intent score:', error);
      return 0;
    }
  }

  /**
   * Calculate engagement score based on interactions
   */
  async calculateEngagementScore(visitorId) {
    try {
      const stats = await database.query(
        `SELECT 
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT pv.id) as total_page_views,
          AVG(pv.time_on_page) as avg_time_on_page,
          AVG(pv.scroll_depth) as avg_scroll_depth,
          COUNT(DISTINCT e.id) as total_events,
          COUNT(CASE WHEN e.event_type = 'form_submit' THEN 1 END) as form_submits,
          COUNT(CASE WHEN e.event_type = 'chat_start' THEN 1 END) as chat_starts,
          COUNT(CASE WHEN e.event_type = 'demo_request' THEN 1 END) as demo_requests
        FROM website_visitors v
        LEFT JOIN visitor_sessions s ON v.id = s.visitor_id
        LEFT JOIN visitor_page_views pv ON v.id = pv.visitor_id
        LEFT JOIN visitor_events e ON v.id = e.visitor_id
        WHERE v.id = $1
        GROUP BY v.id`,
        [visitorId]
      );

      if (stats.rows.length === 0) {
        return 0;
      }

      const s = stats.rows[0];
      let score = 0;

      // Session count
      score += Math.min(parseInt(s.total_sessions) * 10, 20);

      // Page views
      score += Math.min(parseInt(s.total_page_views) * 3, 20);

      // Time on page
      const avgTime = parseFloat(s.avg_time_on_page) || 0;
      if (avgTime > 120) score += 20;
      else if (avgTime > 60) score += 15;
      else if (avgTime > 30) score += 10;

      // Scroll depth
      const avgScroll = parseFloat(s.avg_scroll_depth) || 0;
      if (avgScroll > 75) score += 15;
      else if (avgScroll > 50) score += 10;
      else if (avgScroll > 25) score += 5;

      // Events
      if (parseInt(s.form_submits) > 0) score += 20;
      if (parseInt(s.chat_starts) > 0) score += 15;
      if (parseInt(s.demo_requests) > 0) score += 20;

      return Math.min(score, 100);
    } catch (error) {
      logger.error('Failed to calculate engagement score:', error);
      return 0;
    }
  }

  /**
   * Convert visitor to lead
   */
  async convertVisitorToLead(visitorId, userId, conversionType = 'manual', conversionSource = 'manual') {
    try {
      const visitor = await database.query(
        'SELECT * FROM website_visitors WHERE id = $1',
        [visitorId]
      );

      if (visitor.rows.length === 0) {
        throw new Error('Visitor not found');
      }

      const v = visitor.rows[0];

      if (v.converted_to_lead) {
        throw new Error('Visitor already converted to lead');
      }

      // Create lead from visitor data
      const leadData = {
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.email,
        company_name: v.company_name,
        company_domain: v.company_domain,
        source: 'website',
        source_details: {
          visitor_id: v.visitor_id,
          conversion_type: conversionType,
          conversion_source: conversionSource,
          visitor_score: v.visitor_score,
          intent_score: v.intent_score,
          engagement_score: v.engagement_score
        },
        status: 'new',
        stage: 'lead'
      };

      const lead = await LeadManagementService.createLead(userId, leadData);

      // Update visitor
      await database.query(
        `UPDATE website_visitors
         SET converted_to_lead = true,
             lead_id = $1,
             converted_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [lead.id, visitorId]
      );

      // Log conversion
      const conversionId = uuidv4();
      await database.query(
        `INSERT INTO visitor_lead_conversions (
          id, visitor_id, lead_id, user_id,
          conversion_type, conversion_source,
          visitor_score, intent_score, engagement_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          conversionId,
          visitorId,
          lead.id,
          userId,
          conversionType,
          conversionSource,
          v.visitor_score,
          v.intent_score,
          v.engagement_score
        ]
      );

      logger.info('Visitor converted to lead', { visitorId, leadId: lead.id, userId });
      return lead;
    } catch (error) {
      logger.error('Failed to convert visitor to lead:', error);
      throw error;
    }
  }

  /**
   * Get visitors for user
   */
  async getVisitors(userId, filters = {}) {
    try {
      let query = `
        SELECT *
        FROM website_visitors
        WHERE user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (filters.converted !== undefined) {
        paramCount++;
        query += ` AND converted_to_lead = $${paramCount}`;
        params.push(filters.converted);
      }

      if (filters.min_score !== undefined) {
        paramCount++;
        query += ` AND visitor_score >= $${paramCount}`;
        params.push(filters.min_score);
      }

      if (filters.company_domain) {
        paramCount++;
        query += ` AND company_domain = $${paramCount}`;
        params.push(filters.company_domain);
      }

      query += ` ORDER BY visitor_score DESC, last_visit_at DESC LIMIT ${filters.limit || 50}`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get visitors:', error);
      throw error;
    }
  }

  /**
   * Get visitor by visitor_id string
   */
  async getVisitorByVisitorId(visitorIdString, userId) {
    try {
      const result = await database.query(
        'SELECT * FROM website_visitors WHERE visitor_id = $1 AND user_id = $2',
        [visitorIdString, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get visitor by visitor_id:', error);
      throw error;
    }
  }

  /**
   * Get visitor details
   */
  async getVisitorDetails(visitorId, userId) {
    try {
      const visitor = await database.query(
        'SELECT * FROM website_visitors WHERE id = $1 AND user_id = $2',
        [visitorId, userId]
      );

      if (visitor.rows.length === 0) {
        return null;
      }

      // Get sessions
      const sessions = await database.query(
        'SELECT * FROM visitor_sessions WHERE visitor_id = $1 ORDER BY started_at DESC',
        [visitorId]
      );

      // Get page views
      const pageViews = await database.query(
        'SELECT * FROM visitor_page_views WHERE visitor_id = $1 ORDER BY viewed_at DESC LIMIT 50',
        [visitorId]
      );

      // Get events
      const events = await database.query(
        'SELECT * FROM visitor_events WHERE visitor_id = $1 ORDER BY occurred_at DESC LIMIT 50',
        [visitorId]
      );

      return {
        visitor: visitor.rows[0],
        sessions: sessions.rows,
        pageViews: pageViews.rows,
        events: events.rows
      };
    } catch (error) {
      logger.error('Failed to get visitor details:', error);
      throw error;
    }
  }

  /**
   * Enrich visitor data (basic - can be enhanced with paid APIs)
   */
  async enrichVisitorData(visitorId) {
    try {
      const visitor = await database.query(
        'SELECT * FROM website_visitors WHERE id = $1',
        [visitorId]
      );

      if (visitor.rows.length === 0) {
        return;
      }

      const v = visitor.rows[0];

      // Basic enrichment from domain
      if (v.company_domain) {
        // Extract company name from domain (basic)
        const domainParts = v.company_domain.replace('www.', '').split('.');
        const companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);

        await database.query(
          `UPDATE website_visitors
           SET company_name = COALESCE(company_name, $1),
               updated_at = NOW()
           WHERE id = $2`,
          [companyName, visitorId]
        );
      }

      // TODO: Add paid API enrichment (Clearbit, ZoomInfo, etc.)
    } catch (error) {
      logger.error('Failed to enrich visitor data:', error);
      throw error;
    }
  }

  /**
   * Get visitor analytics
   */
  async getVisitorAnalytics(userId, dateRange = {}) {
    try {
      const startDate = dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange.end || new Date();

      const stats = await database.query(
        `SELECT
          COUNT(*) as total_visitors,
          COUNT(CASE WHEN converted_to_lead THEN 1 END) as converted_visitors,
          COUNT(CASE WHEN visitor_score >= 70 THEN 1 END) as high_score_visitors,
          AVG(visitor_score) as avg_visitor_score,
          AVG(total_visits) as avg_visits_per_visitor
        FROM website_visitors
        WHERE user_id = $1
          AND first_visit_at >= $2
          AND first_visit_at <= $3`,
        [userId, startDate, endDate]
      );

      const topVisitors = await database.query(
        `SELECT *
        FROM website_visitors
        WHERE user_id = $1
          AND first_visit_at >= $2
          AND first_visit_at <= $3
          AND converted_to_lead = false
        ORDER BY visitor_score DESC
        LIMIT 10`,
        [userId, startDate, endDate]
      );

      return {
        stats: stats.rows[0],
        topVisitors: topVisitors.rows
      };
    } catch (error) {
      logger.error('Failed to get visitor analytics:', error);
      throw error;
    }
  }
}

module.exports = new VisitorIntelligenceService();

