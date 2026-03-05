const database = require('../database/connection');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');

/**
 * Sales Reporting Service
 * Provides advanced analytics and reporting for Sales & CRM
 */
class SalesReportingService {
  /**
   * Get dashboard metrics for user
   * @param {number} userId - User ID
   * @param {object} dateRange - Optional date range { startDate, endDate }
   * @returns {object} Dashboard metrics
   */
  async getDashboardMetrics(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = '';
      const params = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND created_at >= $2 AND created_at <= $3';
        params.push(startDate, endDate);
      }

      // Get lead metrics
      const leadsQuery = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN is_qualified = true THEN 1 END) as qualified_leads,
          COUNT(CASE WHEN stage = 'lead' THEN 1 END) as new_leads,
          COUNT(CASE WHEN stage = 'opportunity' THEN 1 END) as opportunities,
          AVG(lead_score) as avg_lead_score
        FROM leads
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const leadsResult = await database.query(leadsQuery, params);
      const leadsMetrics = leadsResult.rows[0];

      // Get deal metrics
      const dealsQuery = `
        SELECT 
          COUNT(*) as total_deals,
          COUNT(CASE WHEN status = 'closed_won' THEN 1 END) as won_deals,
          COUNT(CASE WHEN status = 'closed_lost' THEN 1 END) as lost_deals,
          COUNT(CASE WHEN status NOT IN ('closed_won', 'closed_lost') THEN 1 END) as active_deals,
          SUM(CASE WHEN status NOT IN ('closed_won', 'closed_lost') THEN amount ELSE 0 END) as pipeline_value,
          SUM(CASE WHEN status = 'closed_won' THEN amount ELSE 0 END) as won_revenue,
          AVG(CASE WHEN status = 'closed_won' THEN amount END) as avg_deal_size
        FROM deals
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const dealsResult = await database.query(dealsQuery, params);
      const dealsMetrics = dealsResult.rows[0];

      // Calculate close rate
      const totalClosedDeals = parseInt(dealsMetrics.won_deals) + parseInt(dealsMetrics.lost_deals);
      const closeRate = totalClosedDeals > 0 
        ? (parseInt(dealsMetrics.won_deals) / totalClosedDeals * 100).toFixed(2)
        : 0;

      // Get activity metrics
      const activitiesQuery = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_activities,
          COUNT(CASE WHEN activity_type = 'email' THEN 1 END) as total_emails,
          COUNT(CASE WHEN activity_type = 'call' THEN 1 END) as total_calls,
          COUNT(CASE WHEN activity_type = 'meeting' THEN 1 END) as total_meetings
        FROM activities
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const activitiesResult = await database.query(activitiesQuery, params);
      const activitiesMetrics = activitiesResult.rows[0];

      return {
        leads: {
          total: parseInt(leadsMetrics.total_leads) || 0,
          qualified: parseInt(leadsMetrics.qualified_leads) || 0,
          new: parseInt(leadsMetrics.new_leads) || 0,
          opportunities: parseInt(leadsMetrics.opportunities) || 0,
          avgScore: parseFloat(leadsMetrics.avg_lead_score) || 0,
          qualificationRate: leadsMetrics.total_leads > 0 
            ? (leadsMetrics.qualified_leads / leadsMetrics.total_leads * 100).toFixed(2)
            : 0
        },
        deals: {
          total: parseInt(dealsMetrics.total_deals) || 0,
          active: parseInt(dealsMetrics.active_deals) || 0,
          won: parseInt(dealsMetrics.won_deals) || 0,
          lost: parseInt(dealsMetrics.lost_deals) || 0,
          pipelineValue: parseFloat(dealsMetrics.pipeline_value) || 0,
          wonRevenue: parseFloat(dealsMetrics.won_revenue) || 0,
          avgDealSize: parseFloat(dealsMetrics.avg_deal_size) || 0,
          closeRate: parseFloat(closeRate)
        },
        activities: {
          total: parseInt(activitiesMetrics.total_activities) || 0,
          completed: parseInt(activitiesMetrics.completed_activities) || 0,
          emails: parseInt(activitiesMetrics.total_emails) || 0,
          calls: parseInt(activitiesMetrics.total_calls) || 0,
          meetings: parseInt(activitiesMetrics.total_meetings) || 0,
          completionRate: activitiesMetrics.total_activities > 0
            ? (activitiesMetrics.completed_activities / activitiesMetrics.total_activities * 100).toFixed(2)
            : 0
        }
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue over time
   * @param {number} userId - User ID
   * @param {object} dateRange - Date range { startDate, endDate }
   * @param {string} groupBy - Grouping: 'day', 'week', 'month'
   * @returns {array} Revenue data points
   */
  async getRevenueOverTime(userId, dateRange = {}, groupBy = 'month') {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFormat;
      switch (groupBy) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          break;
        case 'week':
          dateFormat = 'YYYY-"W"IW';
          break;
        case 'month':
        default:
          dateFormat = 'YYYY-MM';
          break;
      }

      const query = `
        SELECT 
          TO_CHAR(actual_close_date, $2) as period,
          SUM(amount) as revenue,
          COUNT(*) as deals_closed,
          AVG(amount) as avg_deal_size
        FROM deals
        WHERE user_id = $1 
          AND status = 'closed_won'
          AND actual_close_date >= $3 
          AND actual_close_date <= $4
        GROUP BY TO_CHAR(actual_close_date, $2)
        ORDER BY period ASC
      `;

      const result = await database.query(query, [
        userId,
        dateFormat,
        startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Default: 1 year ago
        endDate || new Date().toISOString()
      ]);

      return result.rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue) || 0,
        dealsClosed: parseInt(row.deals_closed) || 0,
        avgDealSize: parseFloat(row.avg_deal_size) || 0
      }));
    } catch (error) {
      logger.error('Failed to get revenue over time:', error);
      throw error;
    }
  }

  /**
   * Get lead source attribution
   * @param {number} userId - User ID
   * @param {object} dateRange - Optional date range
   * @returns {array} Lead sources with counts and conversion rates
   */
  async getLeadSourceAttribution(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = '';
      const params = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND l.created_at >= $2 AND l.created_at <= $3';
        params.push(startDate, endDate);
      }

      const query = `
        SELECT 
          l.source,
          COUNT(l.id) as lead_count,
          COUNT(CASE WHEN l.is_qualified = true THEN 1 END) as qualified_count,
          COUNT(CASE WHEN d.id IS NOT NULL THEN 1 END) as converted_count,
          SUM(CASE WHEN d.status = 'closed_won' THEN d.amount ELSE 0 END) as total_revenue
        FROM leads l
        LEFT JOIN deals d ON l.id = d.lead_id
        WHERE l.user_id = $1 ${dateFilter}
        GROUP BY l.source
        ORDER BY lead_count DESC
      `;

      const result = await database.query(query, params);

      return result.rows.map(row => ({
        source: row.source || 'unknown',
        leadCount: parseInt(row.lead_count) || 0,
        qualifiedCount: parseInt(row.qualified_count) || 0,
        convertedCount: parseInt(row.converted_count) || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        qualificationRate: row.lead_count > 0 
          ? (row.qualified_count / row.lead_count * 100).toFixed(2)
          : 0,
        conversionRate: row.lead_count > 0
          ? (row.converted_count / row.lead_count * 100).toFixed(2)
          : 0
      }));
    } catch (error) {
      logger.error('Failed to get lead source attribution:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel metrics
   * @param {number} userId - User ID
   * @param {object} dateRange - Optional date range
   * @returns {object} Funnel metrics
   */
  async getConversionFunnel(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = '';
      const params = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND created_at >= $2 AND created_at <= $3';
        params.push(startDate, endDate);
      }

      // Get funnel counts
      const query = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN is_qualified = true THEN 1 END) as qualified_leads,
          COUNT(CASE WHEN stage = 'opportunity' THEN 1 END) as opportunities,
          (SELECT COUNT(*) FROM deals WHERE user_id = $1 AND status NOT IN ('closed_won', 'closed_lost') ${dateFilter.replace('created_at', 'deals.created_at')}) as active_deals,
          (SELECT COUNT(*) FROM deals WHERE user_id = $1 AND status = 'closed_won' ${dateFilter.replace('created_at', 'deals.created_at')}) as won_deals
        FROM leads
        WHERE user_id = $1 ${dateFilter}
      `;

      const result = await database.query(query, params);
      const data = result.rows[0];

      const totalLeads = parseInt(data.total_leads) || 0;
      const qualifiedLeads = parseInt(data.qualified_leads) || 0;
      const opportunities = parseInt(data.opportunities) || 0;
      const activeDeals = parseInt(data.active_deals) || 0;
      const wonDeals = parseInt(data.won_deals) || 0;

      return {
        stages: [
          {
            stage: 'Total Leads',
            count: totalLeads,
            percentage: 100,
            dropOff: 0
          },
          {
            stage: 'Qualified Leads',
            count: qualifiedLeads,
            percentage: totalLeads > 0 ? (qualifiedLeads / totalLeads * 100).toFixed(2) : 0,
            dropOff: totalLeads - qualifiedLeads
          },
          {
            stage: 'Opportunities',
            count: opportunities,
            percentage: totalLeads > 0 ? (opportunities / totalLeads * 100).toFixed(2) : 0,
            dropOff: qualifiedLeads - opportunities
          },
          {
            stage: 'Active Deals',
            count: activeDeals,
            percentage: totalLeads > 0 ? (activeDeals / totalLeads * 100).toFixed(2) : 0,
            dropOff: opportunities - activeDeals
          },
          {
            stage: 'Closed Won',
            count: wonDeals,
            percentage: totalLeads > 0 ? (wonDeals / totalLeads * 100).toFixed(2) : 0,
            dropOff: activeDeals - wonDeals
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get conversion funnel:', error);
      throw error;
    }
  }

  /**
   * Get sales velocity (average days to close)
   * @param {number} userId - User ID
   * @param {object} dateRange - Optional date range
   * @returns {object} Sales velocity metrics
   */
  async getSalesVelocity(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = '';
      const params = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND d.actual_close_date >= $2 AND d.actual_close_date <= $3';
        params.push(startDate, endDate);
      }

      const query = `
        SELECT 
          AVG(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as avg_days_to_close,
          MIN(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as fastest_close,
          MAX(EXTRACT(DAY FROM (d.actual_close_date - l.created_at))) as slowest_close,
          COUNT(*) as total_closed_deals
        FROM deals d
        JOIN leads l ON d.lead_id = l.id
        WHERE d.user_id = $1 
          AND d.status = 'closed_won'
          ${dateFilter}
      `;

      const result = await database.query(query, params);
      const data = result.rows[0];

      return {
        avgDaysToClose: parseFloat(data.avg_days_to_close) || 0,
        fastestClose: parseInt(data.fastest_close) || 0,
        slowestClose: parseInt(data.slowest_close) || 0,
        totalClosedDeals: parseInt(data.total_closed_deals) || 0
      };
    } catch (error) {
      logger.error('Failed to get sales velocity:', error);
      throw error;
    }
  }

  /**
   * Export data to CSV
   * @param {number} userId - User ID
   * @param {string} reportType - 'leads', 'deals', 'activities'
   * @param {object} dateRange - Optional date range
   * @returns {string} CSV string
   */
  async exportToCSV(userId, reportType, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let query, fields;
      const params = [userId];
      
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = 'AND created_at >= $2 AND created_at <= $3';
        params.push(startDate, endDate);
      }

      switch (reportType) {
        case 'leads':
          query = `
            SELECT 
              first_name, last_name, email, phone, company_name, job_title,
              source, status, stage, is_qualified, lead_score,
              created_at, updated_at
            FROM leads
            WHERE user_id = $1 ${dateFilter}
            ORDER BY created_at DESC
          `;
          fields = ['first_name', 'last_name', 'email', 'phone', 'company_name', 'job_title', 
                    'source', 'status', 'stage', 'is_qualified', 'lead_score', 'created_at', 'updated_at'];
          break;

        case 'deals':
          query = `
            SELECT 
              deal_name, amount, currency, stage, status, win_probability,
              actual_close_date as close_date, created_at, updated_at
            FROM deals
            WHERE user_id = $1 ${dateFilter}
            ORDER BY created_at DESC
          `;
          fields = ['deal_name', 'amount', 'currency', 'stage', 'status', 'win_probability', 
                    'close_date', 'created_at', 'updated_at'];
          break;

        case 'activities':
          query = `
            SELECT 
              activity_type, subject, notes, is_completed, task_due_date,
              created_at, completed_at
            FROM activities
            WHERE user_id = $1 ${dateFilter}
            ORDER BY created_at DESC
          `;
          fields = ['activity_type', 'subject', 'notes', 'is_completed', 'task_due_date', 
                    'created_at', 'completed_at'];
          break;

        default:
          throw new Error('Invalid report type');
      }

      const result = await database.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('No data to export');
      }

      const parser = new Parser({ fields });
      const csv = parser.parse(result.rows);
      
      return csv;
    } catch (error) {
      logger.error('Failed to export to CSV:', error);
      throw error;
    }
  }

  /**
   * Get win/loss analysis
   * @param {number} userId - User ID
   * @param {object} dateRange - Optional date range
   * @returns {object} Win/loss metrics
   */
  async getWinLossAnalysis(userId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      
      let dateFilter = '';
      const params = [userId];
      
      if (startDate && endDate) {
        dateFilter = 'AND actual_close_date >= $2 AND actual_close_date <= $3';
        params.push(startDate, endDate);
      }

      const query = `
        SELECT 
          status,
          COUNT(*) as count,
          SUM(amount) as total_value,
          AVG(amount) as avg_value,
          AVG(win_probability) as avg_win_probability
        FROM deals
        WHERE user_id = $1 
          AND status IN ('closed_won', 'closed_lost')
          ${dateFilter}
        GROUP BY status
      `;

      const result = await database.query(query, params);

      const wonData = result.rows.find(r => r.status === 'closed_won') || {};
      const lostData = result.rows.find(r => r.status === 'closed_lost') || {};

      return {
        won: {
          count: parseInt(wonData.count) || 0,
          totalValue: parseFloat(wonData.total_value) || 0,
          avgValue: parseFloat(wonData.avg_value) || 0,
          avgWinProbability: parseFloat(wonData.avg_win_probability) || 0
        },
        lost: {
          count: parseInt(lostData.count) || 0,
          totalValue: parseFloat(lostData.total_value) || 0,
          avgValue: parseFloat(lostData.avg_value) || 0,
          avgWinProbability: parseFloat(lostData.avg_win_probability) || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get win/loss analysis:', error);
      throw error;
    }
  }
}

module.exports = new SalesReportingService();

