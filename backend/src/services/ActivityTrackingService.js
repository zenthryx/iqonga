const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ActivityTrackingService {
  /**
   * Create a new activity
   */
  async createActivity(userId, activityData, createdBy = null) {
    try {
      const activityId = uuidv4();
      
      const query = `
        INSERT INTO activities (
          id, user_id, company_profile_id, lead_id, deal_id, activity_type,
          subject, description, outcome, duration_minutes, scheduled_at,
          completed_at, is_completed, email_thread_id, email_message_id,
          call_direction, meeting_url, meeting_attendees, task_priority,
          task_due_date, task_assigned_to, custom_fields, tags, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;
      
      const values = [
        activityId,
        userId,
        activityData.company_profile_id || null,
        activityData.lead_id || null,
        activityData.deal_id || null,
        activityData.activity_type,
        activityData.subject || null,
        activityData.description || null,
        activityData.outcome || null,
        activityData.duration_minutes || null,
        activityData.scheduled_at || null,
        activityData.completed_at || null,
        activityData.is_completed || false,
        activityData.email_thread_id || null,
        activityData.email_message_id || null,
        activityData.call_direction || null,
        activityData.meeting_url || null,
        activityData.meeting_attendees || null,
        activityData.task_priority || null,
        activityData.task_due_date || null,
        activityData.task_assigned_to || null,
        JSON.stringify(activityData.custom_fields || {}),
        activityData.tags || [],
        createdBy || userId
      ];
      
      const result = await database.query(query, values);
      const activity = result.rows[0];
      
      logger.info('Activity created successfully', { 
        activityId, 
        userId, 
        type: activityData.activity_type,
        leadId: activityData.lead_id,
        dealId: activityData.deal_id
      });
      
      return activity;
    } catch (error) {
      logger.error('Failed to create activity:', error);
      throw error;
    }
  }

  /**
   * Get activity by ID
   */
  async getActivityById(activityId, userId) {
    try {
      const query = `
        SELECT a.*,
          u.username as created_by_name,
          assigned.username as task_assigned_to_name,
          l.first_name || ' ' || l.last_name as lead_name,
          d.deal_name
        FROM activities a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users assigned ON a.task_assigned_to = assigned.id
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN deals d ON a.deal_id = d.id
        WHERE a.id = $1 AND a.user_id = $2
      `;
      
      const result = await database.query(query, [activityId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get activity:', error);
      throw error;
    }
  }

  /**
   * Get activities with filters
   */
  async getActivities(userId, filters = {}, pagination = { page: 1, limit: 50 }) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT a.*,
          u.username as created_by_name,
          assigned.username as task_assigned_to_name,
          l.first_name || ' ' || l.last_name as lead_name,
          d.deal_name
        FROM activities a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users assigned ON a.task_assigned_to = assigned.id
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN deals d ON a.deal_id = d.id
        WHERE a.user_id = $1
      `;
      
      const queryParams = [userId];
      let paramCounter = 2;
      
      // Apply filters
      if (filters.lead_id) {
        query += ` AND a.lead_id = $${paramCounter}`;
        queryParams.push(filters.lead_id);
        paramCounter++;
      }
      
      if (filters.deal_id) {
        query += ` AND a.deal_id = $${paramCounter}`;
        queryParams.push(filters.deal_id);
        paramCounter++;
      }
      
      if (filters.activity_type) {
        if (Array.isArray(filters.activity_type)) {
          query += ` AND a.activity_type = ANY($${paramCounter})`;
          queryParams.push(filters.activity_type);
        } else {
          query += ` AND a.activity_type = $${paramCounter}`;
          queryParams.push(filters.activity_type);
        }
        paramCounter++;
      }
      
      if (filters.is_completed !== undefined) {
        query += ` AND a.is_completed = $${paramCounter}`;
        queryParams.push(filters.is_completed);
        paramCounter++;
      }
      
      if (filters.task_assigned_to) {
        query += ` AND a.task_assigned_to = $${paramCounter}`;
        queryParams.push(filters.task_assigned_to);
        paramCounter++;
      }
      
      if (filters.date_from) {
        query += ` AND a.created_at >= $${paramCounter}`;
        queryParams.push(filters.date_from);
        paramCounter++;
      }
      
      if (filters.date_to) {
        query += ` AND a.created_at <= $${paramCounter}`;
        queryParams.push(filters.date_to);
        paramCounter++;
      }
      
      // Get total count
      const countQuery = query.replace(/SELECT a\.\*.*FROM/s, 'SELECT COUNT(*) FROM');
      const countResult = await database.query(countQuery, queryParams.slice(0, paramCounter - 1));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Order and paginate
      query += ` ORDER BY a.${filters.sort_by || 'created_at'} ${filters.sort_order || 'DESC'}`;
      query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      queryParams.push(limit, offset);
      
      const result = await database.query(query, queryParams);
      
      return {
        activities: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get activities:', error);
      throw error;
    }
  }

  /**
   * Get activity timeline for lead or deal
   */
  async getActivityTimeline(userId, entityType, entityId) {
    try {
      let query = `
        SELECT a.*,
          u.username as created_by_name,
          assigned.username as task_assigned_to_name
        FROM activities a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN users assigned ON a.task_assigned_to = assigned.id
        WHERE a.user_id = $1
      `;
      
      if (entityType === 'lead') {
        query += ` AND a.lead_id = $2`;
      } else if (entityType === 'deal') {
        query += ` AND a.deal_id = $2`;
      } else {
        throw new Error('Invalid entity type. Must be "lead" or "deal"');
      }
      
      query += ` ORDER BY a.created_at DESC`;
      
      const result = await database.query(query, [userId, entityId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get activity timeline:', error);
      throw error;
    }
  }

  /**
   * Update activity
   */
  async updateActivity(activityId, userId, updates) {
    try {
      const allowedFields = [
        'subject', 'description', 'outcome', 'duration_minutes', 'scheduled_at',
        'completed_at', 'is_completed', 'task_priority', 'task_due_date',
        'task_assigned_to', 'custom_fields', 'tags'
      ];
      
      const updateFields = [];
      const values = [];
      let paramCounter = 1;
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCounter}`);
          
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
      
      values.push(activityId, userId);
      
      const query = `
        UPDATE activities 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCounter} AND user_id = $${paramCounter + 1}
        RETURNING *
      `;
      
      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Activity not found or unauthorized');
      }
      
      logger.info('Activity updated successfully', { activityId, userId });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update activity:', error);
      throw error;
    }
  }

  /**
   * Mark activity/task as completed
   */
  async completeActivity(activityId, userId, outcome = null) {
    try {
      const updates = {
        is_completed: true,
        completed_at: new Date()
      };
      
      if (outcome) {
        updates.outcome = outcome;
      }
      
      const activity = await this.updateActivity(activityId, userId, updates);
      
      logger.info('Activity marked as completed', { activityId, userId });
      
      return activity;
    } catch (error) {
      logger.error('Failed to complete activity:', error);
      throw error;
    }
  }

  /**
   * Delete activity
   */
  async deleteActivity(activityId, userId) {
    try {
      const query = `
        DELETE FROM activities 
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await database.query(query, [activityId, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Activity not found or unauthorized');
      }
      
      logger.info('Activity deleted successfully', { activityId, userId });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete activity:', error);
      throw error;
    }
  }

  /**
   * Log email activity
   */
  async logEmail(userId, emailData) {
    try {
      const activityData = {
        activity_type: emailData.direction === 'sent' ? 'email_sent' : 'email_received',
        lead_id: emailData.lead_id,
        deal_id: emailData.deal_id,
        subject: emailData.subject,
        description: emailData.body_preview || emailData.body,
        email_thread_id: emailData.thread_id,
        email_message_id: emailData.message_id,
        completed_at: new Date(),
        is_completed: true
      };
      
      return await this.createActivity(userId, activityData);
    } catch (error) {
      logger.error('Failed to log email activity:', error);
      throw error;
    }
  }

  /**
   * Log call activity
   */
  async logCall(userId, callData) {
    try {
      const activityData = {
        activity_type: 'call',
        lead_id: callData.lead_id,
        deal_id: callData.deal_id,
        subject: callData.subject || `Call with ${callData.contact_name}`,
        description: callData.notes,
        outcome: callData.outcome,
        duration_minutes: callData.duration_minutes,
        call_direction: callData.direction,
        call_recording_url: callData.recording_url,
        completed_at: new Date(),
        is_completed: true
      };
      
      return await this.createActivity(userId, activityData);
    } catch (error) {
      logger.error('Failed to log call activity:', error);
      throw error;
    }
  }

  /**
   * Log meeting activity
   */
  async logMeeting(userId, meetingData) {
    try {
      const activityData = {
        activity_type: 'meeting',
        lead_id: meetingData.lead_id,
        deal_id: meetingData.deal_id,
        subject: meetingData.subject,
        description: meetingData.notes,
        outcome: meetingData.outcome,
        duration_minutes: meetingData.duration_minutes,
        meeting_url: meetingData.meeting_url,
        meeting_attendees: meetingData.attendees,
        scheduled_at: meetingData.scheduled_at,
        completed_at: meetingData.completed_at || new Date(),
        is_completed: meetingData.is_completed !== false
      };
      
      return await this.createActivity(userId, activityData);
    } catch (error) {
      logger.error('Failed to log meeting activity:', error);
      throw error;
    }
  }

  /**
   * Create task
   */
  async createTask(userId, taskData) {
    try {
      const activityData = {
        activity_type: 'task',
        lead_id: taskData.lead_id,
        deal_id: taskData.deal_id,
        subject: taskData.subject,
        description: taskData.description,
        task_priority: taskData.priority || 'medium',
        task_due_date: taskData.due_date,
        task_assigned_to: taskData.assigned_to || userId,
        is_completed: false
      };
      
      const task = await this.createActivity(userId, activityData);
      
      logger.info('Task created successfully', { taskId: task.id, userId });
      
      return task;
    } catch (error) {
      logger.error('Failed to create task:', error);
      throw error;
    }
  }

  /**
   * Get tasks (pending or all)
   */
  async getTasks(userId, filters = {}) {
    try {
      const taskFilters = {
        ...filters,
        activity_type: 'task'
      };
      
      return await this.getActivities(userId, taskFilters);
    } catch (error) {
      logger.error('Failed to get tasks:', error);
      throw error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId) {
    try {
      const query = `
        SELECT a.*,
          assigned.username as task_assigned_to_name,
          l.first_name || ' ' || l.last_name as lead_name,
          d.deal_name
        FROM activities a
        LEFT JOIN users assigned ON a.task_assigned_to = assigned.id
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN deals d ON a.deal_id = d.id
        WHERE a.user_id = $1
          AND a.activity_type = 'task'
          AND a.is_completed = false
          AND a.task_due_date < NOW()
        ORDER BY a.task_due_date ASC
      `;
      
      const result = await database.query(query, [userId]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get overdue tasks:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(userId, dateRange = null) {
    try {
      let dateFilter = '';
      const params = [userId];
      
      if (dateRange) {
        dateFilter = `AND created_at >= $2 AND created_at <= $3`;
        params.push(dateRange.start, dateRange.end);
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(*) FILTER (WHERE activity_type LIKE 'email%') as emails,
          COUNT(*) FILTER (WHERE activity_type = 'call') as calls,
          COUNT(*) FILTER (WHERE activity_type = 'meeting') as meetings,
          COUNT(*) FILTER (WHERE activity_type = 'task') as tasks,
          COUNT(*) FILTER (WHERE activity_type = 'task' AND is_completed = true) as completed_tasks,
          COUNT(*) FILTER (WHERE activity_type = 'task' AND is_completed = false) as pending_tasks,
          COUNT(*) FILTER (WHERE activity_type = 'task' AND is_completed = false AND task_due_date < NOW()) as overdue_tasks
        FROM activities
        WHERE user_id = $1 ${dateFilter}
      `;
      
      const result = await database.query(query, params);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get activity stats:', error);
      throw error;
    }
  }

  /**
   * Track email engagement (opens, clicks)
   */
  async trackEmailEngagement(userId, emailMessageId, engagementType) {
    try {
      const updateField = engagementType === 'open' ? 'email_opened' : 'email_clicked';
      
      const query = `
        UPDATE activities 
        SET ${updateField} = true
        WHERE user_id = $1 
          AND email_message_id = $2
          AND activity_type = 'email_sent'
        RETURNING *
      `;
      
      const result = await database.query(query, [userId, emailMessageId]);
      
      if (result.rows.length > 0) {
        const activity = result.rows[0];
        
        // Update lead engagement metrics
        if (activity.lead_id) {
          const leadUpdateField = engagementType === 'open' ? 'email_opens' : 'email_clicks';
          await database.query(`
            UPDATE leads 
            SET ${leadUpdateField} = ${leadUpdateField} + 1,
                last_activity_date = NOW()
            WHERE id = $1
          `, [activity.lead_id]);
          
          // Recalculate lead score
          const LeadManagementService = require('./LeadManagementService');
          await LeadManagementService.calculateLeadScore(activity.lead_id);
        }
        
        logger.info('Email engagement tracked', { 
          emailMessageId, 
          engagementType, 
          activityId: activity.id 
        });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to track email engagement:', error);
      throw error;
    }
  }
}

module.exports = new ActivityTrackingService();

