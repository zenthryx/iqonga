const { google } = require('googleapis');
const database = require('../database/connection');
const logger = require('../utils/logger');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  /**
   * Create OAuth2 client
   */
  createOAuth2Client() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'https://www.iqonga.org/api/calendar/auth/callback';
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar OAuth credentials not configured. Please set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env');
    }
    
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate authorization URL
   */
  getAuthorizationUrl(state) {
    const oauth2Client = this.createOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code) {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Initialize service for a specific user
   */
  async initializeForUser(userId) {
    try {
      const result = await database.query(
        'SELECT * FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'google']
      );

      if (result.rows.length === 0) {
        throw new Error('No active calendar account found');
      }

      const account = result.rows[0];

      // Check if token is expired
      if (new Date(account.token_expires_at) <= new Date()) {
        logger.info('Access token expired, refreshing...', { userId, accountId: account.id });
        const newAccessToken = await this.refreshAccessToken(account.id, account.refresh_token);
        account.access_token = newAccessToken;
      }

      return account;
    } catch (error) {
      logger.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(accountId, refreshToken) {
    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Calculate expiry time
      const expiryDate = credentials.expiry_date 
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600000); // 1 hour from now
      
      // Update tokens in database
      await database.query(
        `UPDATE user_calendar_accounts 
         SET access_token = $1, 
             token_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          credentials.access_token,
          expiryDate,
          accountId
        ]
      );

      logger.info('Calendar access token refreshed successfully', { accountId });
      return credentials.access_token;
    } catch (error) {
      logger.error('Failed to refresh calendar access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Sync calendar events for user
   */
  async syncEventsForUser(userId, options = {}) {
    try {
      const account = await this.initializeForUser(userId);
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get time range for sync
      const timeMin = options.timeMin || new Date().toISOString();
      const timeMax = options.timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead
      const maxResults = options.maxResults || 100;

      logger.info('Syncing calendar events', { userId, accountId: account.id, timeMin, timeMax });

      // Get calendar list first
      const calendarsResponse = await calendar.calendarList.list();
      const calendars = calendarsResponse.data.items || [];

      let totalSynced = 0;
      let totalFailed = 0;

      // Sync events from each calendar
      for (const cal of calendars) {
        try {
          const eventsResponse = await calendar.events.list({
            calendarId: cal.id,
            timeMin: timeMin,
            timeMax: timeMax,
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime'
          });

          const events = eventsResponse.data.items || [];

          for (const event of events) {
            try {
              await this.saveEvent(userId, account.id, cal.id, event);
              totalSynced++;
            } catch (error) {
              logger.error('Failed to save event:', { eventId: event.id, error: error.message });
              totalFailed++;
            }
          }
        } catch (error) {
          logger.error('Failed to sync calendar:', { calendarId: cal.id, error: error.message });
        }
      }

      // Update last sync time
      await database.query(
        'UPDATE user_calendar_accounts SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
        [account.id]
      );

      logger.info('Calendar sync completed', { 
        userId, 
        accountId: account.id, 
        synced: totalSynced, 
        failed: totalFailed 
      });

      return { synced: totalSynced, failed: totalFailed };
    } catch (error) {
      logger.error('Failed to sync calendar events for user:', error);
      throw error;
    }
  }

  /**
   * Save calendar event to database
   */
  async saveEvent(userId, accountId, calendarId, event) {
    try {
      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;

      if (!startTime || !endTime) {
        logger.warn('Event missing start/end time, skipping', { eventId: event.id });
        return;
      }

      await database.query(
        `INSERT INTO calendar_events (
          account_id, user_id, provider_event_id, calendar_id,
          summary, description, location,
          start_time, end_time, start_timezone, end_timezone,
          is_all_day, status, attendees, organizer,
          recurring_event_id, recurrence, conference_data,
          reminders, color_id, visibility, transparency,
          html_link, hangout_link, meet_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (account_id, provider_event_id) 
        DO UPDATE SET
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          start_timezone = EXCLUDED.start_timezone,
          end_timezone = EXCLUDED.end_timezone,
          is_all_day = EXCLUDED.is_all_day,
          status = EXCLUDED.status,
          attendees = EXCLUDED.attendees,
          organizer = EXCLUDED.organizer,
          recurring_event_id = EXCLUDED.recurring_event_id,
          recurrence = EXCLUDED.recurrence,
          conference_data = EXCLUDED.conference_data,
          reminders = EXCLUDED.reminders,
          color_id = EXCLUDED.color_id,
          visibility = EXCLUDED.visibility,
          transparency = EXCLUDED.transparency,
          html_link = EXCLUDED.html_link,
          hangout_link = EXCLUDED.hangout_link,
          meet_link = EXCLUDED.meet_link,
          updated_at = CURRENT_TIMESTAMP`,
        [
          accountId,
          userId,
          event.id,
          calendarId,
          event.summary || 'No Title',
          event.description || null,
          event.location || null,
          startTime,
          endTime,
          event.start?.timeZone || null,
          event.end?.timeZone || null,
          !event.start?.dateTime, // is_all_day
          event.status || 'confirmed',
          JSON.stringify(event.attendees || []),
          JSON.stringify(event.organizer || {}),
          event.recurringEventId || null,
          event.recurrence || null,
          JSON.stringify(event.conferenceData || {}),
          JSON.stringify(event.reminders || {}),
          event.colorId || null,
          event.visibility || null,
          event.transparency || null,
          event.htmlLink || null,
          event.hangoutLink || null,
          event.conferenceData?.entryPoints?.[0]?.uri || null
        ]
      );

      logger.debug('Event saved successfully', { eventId: event.id, userId });
    } catch (error) {
      logger.error('Failed to save event:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events for user
   */
  async getUpcomingEvents(userId, options = {}) {
    try {
      const {
        limit = 20,
        daysAhead = 7
      } = options;

      const account = await database.query(
        'SELECT id FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'google']
      );

      if (account.rows.length === 0) {
        return [];
      }

      const accountId = account.rows[0].id;
      const endTime = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      const result = await database.query(
        `SELECT * FROM calendar_events 
         WHERE account_id = $1 
         AND start_time >= CURRENT_TIMESTAMP 
         AND start_time <= $2 
         AND status != 'cancelled'
         ORDER BY start_time ASC 
         LIMIT $3`,
        [accountId, endTime, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get upcoming events:', error);
      throw error;
    }
  }

  /**
   * Get calendar statistics
   */
  async getCalendarStats(userId) {
    try {
      const account = await database.query(
        'SELECT id FROM user_calendar_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'google']
      );

      if (account.rows.length === 0) {
        return {
          totalEvents: 0,
          upcomingEvents: 0,
          todayEvents: 0,
          thisWeekEvents: 0
        };
      }

      const accountId = account.rows[0].id;

      const stats = await database.query(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE start_time >= CURRENT_TIMESTAMP) as upcoming_events,
          COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_events,
          COUNT(*) FILTER (WHERE start_time >= CURRENT_DATE AND start_time < CURRENT_DATE + INTERVAL '7 days') as week_events
         FROM calendar_events 
         WHERE account_id = $1 AND status != 'cancelled'`,
        [accountId]
      );

      return {
        totalEvents: parseInt(stats.rows[0].total_events) || 0,
        upcomingEvents: parseInt(stats.rows[0].upcoming_events) || 0,
        todayEvents: parseInt(stats.rows[0].today_events) || 0,
        thisWeekEvents: parseInt(stats.rows[0].week_events) || 0
      };
    } catch (error) {
      logger.error('Failed to get calendar stats:', error);
      throw error;
    }
  }

  /**
   * Create new calendar event
   */
  async createEvent(userId, eventData) {
    try {
      const account = await this.initializeForUser(userId);
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const event = {
        summary: eventData.summary,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: true
        }
      };

      if (eventData.conferenceData) {
        event.conferenceData = {
          createRequest: {
            requestId: `${Date.now()}-${userId}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        };
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: eventData.conferenceData ? 1 : 0
      });

      logger.info('Calendar event created', { userId, eventId: response.data.id });

      // Save to database
      await this.saveEvent(userId, account.id, 'primary', response.data);

      return response.data;
    } catch (error) {
      logger.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(userId, eventId, eventData) {
    try {
      const account = await this.initializeForUser(userId);
      
      // Get event from database to get provider_event_id
      const eventResult = await database.query(
        'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }

      const dbEvent = eventResult.rows[0];
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Build update data
      const updateData = {};
      
      if (eventData.summary !== undefined) updateData.summary = eventData.summary;
      if (eventData.description !== undefined) updateData.description = eventData.description;
      if (eventData.location !== undefined) updateData.location = eventData.location;
      
      if (eventData.startTime) {
        updateData.start = {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        };
      }
      
      if (eventData.endTime) {
        updateData.end = {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        };
      }
      
      if (eventData.attendees !== undefined) {
        updateData.attendees = eventData.attendees;
      }

      // Update in Google Calendar
      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: dbEvent.provider_event_id,
        resource: updateData
      });

      logger.info('Calendar event updated', { userId, eventId: dbEvent.provider_event_id });

      // Update database
      await this.saveEvent(userId, account.id, 'primary', response.data);

      return response.data;
    } catch (error) {
      logger.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event (permanently)
   */
  async deleteEvent(userId, eventId) {
    try {
      const account = await this.initializeForUser(userId);
      
      // Get event from database
      const eventResult = await database.query(
        'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }

      const dbEvent = eventResult.rows[0];
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Delete from Google Calendar
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: dbEvent.provider_event_id
      });

      // Delete from database
      await database.query(
        'DELETE FROM calendar_events WHERE id = $1',
        [eventId]
      );

      logger.info('Calendar event deleted', { userId, eventId: dbEvent.provider_event_id });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  /**
   * Cancel calendar event (soft delete - marks as cancelled)
   */
  async cancelEvent(userId, eventId) {
    try {
      const account = await this.initializeForUser(userId);
      
      // Get event from database
      const eventResult = await database.query(
        'SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2',
        [eventId, userId]
      );

      if (eventResult.rows.length === 0) {
        throw new Error('Event not found');
      }

      const dbEvent = eventResult.rows[0];
      
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: account.access_token
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Cancel in Google Calendar (status = 'cancelled')
      const response = await calendar.events.patch({
        calendarId: 'primary',
        eventId: dbEvent.provider_event_id,
        resource: {
          status: 'cancelled'
        }
      });

      // Update database
      await database.query(
        'UPDATE calendar_events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', eventId]
      );

      logger.info('Calendar event cancelled', { userId, eventId: dbEvent.provider_event_id });

      return response.data;
    } catch (error) {
      logger.error('Failed to cancel calendar event:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();

