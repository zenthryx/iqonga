const database = require('../database/connection');
const logger = require('../utils/logger');
const { google } = require('googleapis');
const ActivityTrackingService = require('./ActivityTrackingService');

/**
 * Meeting Scheduler Service
 * Integrates with Google Calendar for meeting scheduling
 */
class MeetingSchedulerService {
  /**
   * Get Google Calendar OAuth client for user
   */
  async getCalendarClient(userId) {
    try {
      // Get user's Google Calendar OAuth tokens
      const result = await database.query(
        `SELECT google_calendar_refresh_token, google_calendar_access_token 
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].google_calendar_refresh_token) {
        throw new Error('Google Calendar not connected. Please connect in AI Calendar first.');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: result.rows[0].google_calendar_refresh_token,
        access_token: result.rows[0].google_calendar_access_token
      });

      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      logger.error('Failed to get calendar client:', error);
      throw error;
    }
  }

  /**
   * Schedule a meeting
   * @param {number} userId - User ID
   * @param {object} meetingData - Meeting details
   * @returns {object} Created meeting
   */
  async scheduleMeeting(userId, meetingData) {
    try {
      const {
        leadId,
        dealId,
        title,
        description,
        startTime,
        endTime,
        attendeeEmails = [],
        location
      } = meetingData;

      // Get calendar client
      const calendar = await this.getCalendarClient(userId);

      // Create Google Calendar event
      const event = {
        summary: title,
        description: description || '',
        location: location || '',
        start: {
          dateTime: startTime,
          timeZone: 'America/Los_Angeles' // TODO: Get from user settings
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/Los_Angeles'
        },
        attendees: attendeeEmails.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all' // Send email invitations
      });

      const googleEvent = response.data;

      // Log to activities
      const activityData = {
        leadId,
        dealId,
        type: 'meeting',
        subject: title,
        notes: description || '',
        dueDate: startTime,
        status: 'pending'
      };

      const activity = await ActivityTrackingService.logActivity(userId, activityData);

      logger.info('Meeting scheduled successfully', {
        userId,
        leadId,
        dealId,
        eventId: googleEvent.id
      });

      return {
        googleEventId: googleEvent.id,
        googleEventLink: googleEvent.htmlLink,
        activity,
        ...meetingData
      };
    } catch (error) {
      logger.error('Failed to schedule meeting:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a lead
   * @param {string} leadId - Lead ID
   * @param {number} userId - User ID
   * @returns {array} Meetings
   */
  async getMeetingsForLead(leadId, userId) {
    try {
      const query = `
        SELECT *
        FROM activities
        WHERE lead_id = $1 
          AND user_id = $2 
          AND activity_type = 'meeting'
        ORDER BY task_due_date DESC
      `;

      const result = await database.query(query, [leadId, userId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get meetings for lead:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a deal
   * @param {string} dealId - Deal ID
   * @param {number} userId - User ID
   * @returns {array} Meetings
   */
  async getMeetingsForDeal(dealId, userId) {
    try {
      const query = `
        SELECT *
        FROM activities
        WHERE deal_id = $1 
          AND user_id = $2 
          AND activity_type = 'meeting'
        ORDER BY task_due_date DESC
      `;

      const result = await database.query(query, [dealId, userId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get meetings for deal:', error);
      throw error;
    }
  }

  /**
   * Get upcoming meetings
   * @param {number} userId - User ID
   * @param {number} days - Number of days to look ahead
   * @returns {array} Upcoming meetings
   */
  async getUpcomingMeetings(userId, days = 7) {
    try {
      const query = `
        SELECT a.*, l.first_name, l.last_name, l.company_name, d.deal_name
        FROM activities a
        LEFT JOIN leads l ON a.lead_id = l.id
        LEFT JOIN deals d ON a.deal_id = d.id
        WHERE a.user_id = $1 
          AND a.activity_type = 'meeting'
          AND a.task_due_date >= NOW()
          AND a.task_due_date <= NOW() + INTERVAL '1 day' * $2
          AND a.is_completed = false
        ORDER BY a.task_due_date ASC
      `;

      const result = await database.query(query, [userId, days]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get upcoming meetings:', error);
      throw error;
    }
  }

  /**
   * Cancel a meeting
   * @param {string} activityId - Activity ID
   * @param {number} userId - User ID
   * @returns {object} Updated activity
   */
  async cancelMeeting(activityId, userId) {
    try {
      // TODO: Also delete from Google Calendar if we store event IDs
      
      // Mark activity as completed/cancelled
      const activity = await ActivityTrackingService.updateActivity(activityId, userId, {
        is_completed: true,
        notes: 'Meeting cancelled'
      });

      return activity;
    } catch (error) {
      logger.error('Failed to cancel meeting:', error);
      throw error;
    }
  }

  /**
   * Get user's availability
   * @param {number} userId - User ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {array} Busy time slots
   */
  async getAvailability(userId, startDate, endDate) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate,
          timeMax: endDate,
          items: [{ id: 'primary' }]
        }
      });

      const busySlots = response.data.calendars.primary.busy || [];
      
      return {
        busySlots,
        availableSlots: this.calculateAvailableSlots(busySlots, startDate, endDate)
      };
    } catch (error) {
      logger.error('Failed to get availability:', error);
      throw error;
    }
  }

  /**
   * Calculate available time slots
   * @param {array} busySlots - Busy time slots
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {array} Available time slots
   */
  calculateAvailableSlots(busySlots, startDate, endDate) {
    // Simple implementation: return 9am-5pm slots, excluding busy times
    const availableSlots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // TODO: Implement proper slot calculation based on business hours and busy times
    // For now, just return empty array
    
    return availableSlots;
  }
}

module.exports = new MeetingSchedulerService();

