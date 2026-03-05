const database = require('../database/connection');
const logger = require('../utils/logger');
const AIMeetingPrepService = require('./AIMeetingPrepService');
const GmailService = require('./GmailService');

class MeetingReminderService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the reminder scheduler
   * Runs every 5 minutes to check for reminders to send
   */
  start() {
    if (this.isRunning) {
      logger.info('Reminder scheduler already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting meeting reminder scheduler...');

    // Run immediately on start
    this.checkAndSendReminders();

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('Meeting reminder scheduler started (runs every 5 minutes)');
  }

  /**
   * Stop the reminder scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Meeting reminder scheduler stopped');
  }

  /**
   * Main function to check and send all types of reminders
   */
  async checkAndSendReminders() {
    try {
      logger.info('Checking for reminders to send...');

      // Run all reminder checks in parallel
      await Promise.all([
        this.sendPreMeetingReminders(),
        this.sendDailyDigests(),
        this.sendWeeklyPreviews()
      ]);

      logger.info('Reminder check complete');
    } catch (error) {
      logger.error('Error in reminder check:', error);
    }
  }

  /**
   * Send pre-meeting reminders (e.g., 30 minutes before)
   */
  async sendPreMeetingReminders() {
    try {
      // Get all users with pre-meeting reminders enabled
      const prefsResult = await database.query(`
        SELECT p.*, u.email, u.id as user_id
        FROM meeting_reminder_preferences p
        JOIN users u ON p.user_id = u.id
        WHERE p.enable_pre_meeting_reminders = true
        AND u.email IS NOT NULL
      `);

      for (const pref of prefsResult.rows) {
        try {
          await this.checkPreMeetingRemindersForUser(pref);
        } catch (error) {
          logger.error('Error sending pre-meeting reminder for user:', { userId: pref.user_id, error: error.message });
        }
      }
    } catch (error) {
      logger.error('Error in sendPreMeetingReminders:', error);
    }
  }

  /**
   * Check and send pre-meeting reminders for a specific user
   */
  async checkPreMeetingRemindersForUser(pref) {
    const userId = pref.user_id;
    const minutesBefore = pref.reminder_minutes_before || 30;

    // Calculate time window
    const now = new Date();
    const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
    const windowEnd = new Date(reminderTime.getTime() + 5 * 60 * 1000); // +5 min window

    // Find events starting in the reminder window
    const eventsResult = await database.query(`
      SELECT ce.*
      FROM calendar_events ce
      WHERE ce.user_id = $1
      AND ce.start_time > $2
      AND ce.start_time <= $3
      AND ce.status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM meeting_reminders_sent mrs
        WHERE mrs.user_id = ce.user_id
        AND mrs.event_id = ce.id
        AND mrs.reminder_type = 'pre_meeting'
        AND mrs.sent_at::date = CURRENT_DATE
      )
    `, [userId, reminderTime, windowEnd]);

    for (const event of eventsResult.rows) {
      try {
        await this.sendPreMeetingReminderEmail(userId, event, pref, minutesBefore);
      } catch (error) {
        logger.error('Error sending reminder email:', { userId, eventId: event.id, error: error.message });
      }
    }
  }

  /**
   * Send a pre-meeting reminder email
   */
  async sendPreMeetingReminderEmail(userId, event, pref, minutesBefore) {
    try {
      // Check if Gmail connected
      const gmailAccount = await database.query(
        'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'gmail']
      );

      if (gmailAccount.rows.length === 0) {
        logger.warn('Gmail not connected, skipping reminder', { userId });
        return;
      }

      // Get or generate meeting prep if enabled
      let prepHtml = '';
      let prepText = '';

      if (pref.include_ai_insights) {
        try {
          const prep = await AIMeetingPrepService.getMeetingPrep(userId, event.id);
          if (!prep) {
            // Generate new prep
            await AIMeetingPrepService.generateMeetingPrep(userId, event.id);
            const newPrep = await AIMeetingPrepService.getMeetingPrep(userId, event.id);
            if (newPrep) {
              prepHtml = this.buildMiniPrepHTML(newPrep, event);
              prepText = this.buildMiniPrepText(newPrep, event);
            }
          } else {
            prepHtml = this.buildMiniPrepHTML(prep, event);
            prepText = this.buildMiniPrepText(prep, event);
          }
        } catch (error) {
          logger.warn('Failed to get AI prep for reminder, sending without', { userId, eventId: event.id });
        }
      }

      // Build email
      const subject = `⏰ Reminder: ${event.summary} in ${minutesBefore} minutes`;
      const html = this.buildReminderEmailHTML(event, minutesBefore, prepHtml);
      const body = this.buildReminderEmailText(event, minutesBefore, prepText);

      // Send email
      await GmailService.sendEmail(userId, {
        to: pref.email,
        subject: subject,
        body: body,
        html: html
      });

      // Track that we sent this reminder
      await database.query(`
        INSERT INTO meeting_reminders_sent (user_id, event_id, reminder_type)
        VALUES ($1, $2, 'pre_meeting')
      `, [userId, event.id]);

      logger.info('Pre-meeting reminder sent', { userId, eventId: event.id, minutesBefore });
    } catch (error) {
      logger.error('Failed to send pre-meeting reminder:', error);
      throw error;
    }
  }

  /**
   * Build reminder email HTML
   */
  buildReminderEmailHTML(event, minutesBefore, prepHtml) {
    const startTime = new Date(event.start_time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ⏰ Meeting Reminder
              </h1>
              <p style="margin: 10px 0 0 0; color: #fef3c7; font-size: 16px; font-weight: 600;">
                Starting in ${minutesBefore} minutes!
              </p>
            </td>
          </tr>

          <!-- Meeting Details -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 24px; font-weight: bold;">
                ${event.summary}
              </h2>
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 16px;">
                📅 ${startTime}
              </p>
              ${event.location ? `<p style="margin: 0 0 10px 0; color: #6b7280; font-size: 16px;">📍 ${event.location}</p>` : ''}
              ${event.description ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                  ${event.description}
                </p>
              </div>
              ` : ''}
            </td>
          </tr>

          ${event.meet_link ? `
          <!-- Google Meet Link -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <a href="${event.meet_link}" style="display: block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px;">
                🎥 Join Google Meet Now
              </a>
            </td>
          </tr>
          ` : ''}

          ${prepHtml ? `
          <!-- AI Prep -->
          <tr>
            <td style="padding: 0 30px 30px 30px; border-top: 1px solid #e5e7eb;">
              ${prepHtml}
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Automated reminder from <strong style="color: #f59e0b;">Iqonga</strong>
              </p>
              <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
                Manage reminder settings in your calendar
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Build reminder email plain text
   */
  buildReminderEmailText(event, minutesBefore, prepText) {
    const startTime = new Date(event.start_time).toLocaleString();

    let text = `⏰ MEETING REMINDER\n\n`;
    text += `Starting in ${minutesBefore} minutes!\n\n`;
    text += `${event.summary}\n`;
    text += `📅 ${startTime}\n`;
    if (event.location) text += `📍 ${event.location}\n`;
    if (event.description) text += `\n${event.description}\n`;
    if (event.meet_link) text += `\n🎥 Join: ${event.meet_link}\n`;
    if (prepText) text += `\n${prepText}`;
    text += `\n---\nAutomated reminder from Iqonga\n`;

    return text;
  }

  /**
   * Build mini prep HTML (condensed version for reminders)
   */
  buildMiniPrepHTML(prep, event) {
    if (!prep) return '';

    return `
      <div style="margin-top: 20px; padding: 20px; background-color: #faf5ff; border-radius: 8px; border-left: 4px solid #9333ea;">
        <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
          🤖 AI Meeting Prep
        </h3>
        ${prep.discussionTopics && prep.discussionTopics.length > 0 ? `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Discussion Topics</p>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
            ${prep.discussionTopics.slice(0, 3).map(topic => `<li>${topic}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: right;">
          <a href="https://www.iqonga.org/calendar" style="color: #7e22ce; text-decoration: none;">View full prep →</a>
        </p>
      </div>
    `;
  }

  /**
   * Build mini prep text (condensed version for reminders)
   */
  buildMiniPrepText(prep, event) {
    if (!prep) return '';

    let text = `\n🤖 AI MEETING PREP\n\n`;
    if (prep.discussionTopics && prep.discussionTopics.length > 0) {
      text += `DISCUSSION TOPICS:\n`;
      prep.discussionTopics.slice(0, 3).forEach((topic, i) => {
        text += `${i + 1}. ${topic}\n`;
      });
    }
    text += `\nView full prep at: https://www.iqonga.org/calendar\n`;

    return text;
  }

  /**
   * Send daily digests (morning email with today's meetings)
   */
  async sendDailyDigests() {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Get users who should receive digest now (within 5-minute window)
      const prefsResult = await database.query(`
        SELECT p.*, u.email, u.id as user_id
        FROM meeting_reminder_preferences p
        JOIN users u ON p.user_id = u.id
        WHERE p.enable_daily_digest = true
        AND u.email IS NOT NULL
        AND EXTRACT(HOUR FROM p.daily_digest_time) = $1
        AND EXTRACT(MINUTE FROM p.daily_digest_time) BETWEEN $2 AND $3
        AND NOT EXISTS (
          SELECT 1 FROM meeting_reminders_sent mrs
          WHERE mrs.user_id = p.user_id
          AND mrs.reminder_type = 'daily_digest'
          AND mrs.sent_at::date = CURRENT_DATE
        )
      `, [currentHour, Math.max(0, currentMinute - 5), currentMinute + 5]);

      for (const pref of prefsResult.rows) {
        try {
          await this.sendDailyDigestEmail(pref);
        } catch (error) {
          logger.error('Error sending daily digest:', { userId: pref.user_id, error: error.message });
        }
      }
    } catch (error) {
      logger.error('Error in sendDailyDigests:', error);
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigestEmail(pref) {
    const userId = pref.user_id;

    // Get today's events
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const eventsResult = await database.query(`
      SELECT * FROM calendar_events
      WHERE user_id = $1
      AND start_time >= $2
      AND start_time <= $3
      AND status != 'cancelled'
      ORDER BY start_time ASC
    `, [userId, todayStart, todayEnd]);

    if (eventsResult.rows.length === 0) {
      logger.info('No events today, skipping digest', { userId });
      return;
    }

    const events = eventsResult.rows;

    // Build email
    const subject = `📅 Today's Schedule: ${events.length} meeting${events.length > 1 ? 's' : ''}`;
    const html = this.buildDailyDigestHTML(events);
    const body = this.buildDailyDigestText(events);

    // Send email
    await GmailService.sendEmail(userId, {
      to: pref.email,
      subject: subject,
      body: body,
      html: html
    });

    // Track that we sent this digest
    await database.query(`
      INSERT INTO meeting_reminders_sent (user_id, reminder_type)
      VALUES ($1, 'daily_digest')
    `, [userId]);

    logger.info('Daily digest sent', { userId, eventCount: events.length });
  }

  /**
   * Build daily digest HTML
   */
  buildDailyDigestHTML(events) {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Meeting Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📅 Today's Schedule
              </h1>
              <p style="margin: 10px 0 0 0; color: #ddd6fe; font-size: 14px;">
                ${today}
              </p>
            </td>
          </tr>

          <!-- Event Count -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
                ${events.length} meeting${events.length > 1 ? 's' : ''} scheduled today
              </p>
            </td>
          </tr>

          <!-- Events List -->
          ${events.map((event, index) => `
          <tr>
            <td style="padding: 20px 30px; ${index < events.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
              <div style="display: flex; align-items: start;">
                <div style="flex-shrink: 0; width: 60px; text-align: center;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 600;">
                    ${new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div style="flex: 1; margin-left: 20px;">
                  <h3 style="margin: 0 0 5px 0; color: #111827; font-size: 16px; font-weight: 600;">
                    ${event.summary}
                  </h3>
                  ${event.location ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">📍 ${event.location}</p>` : ''}
                  ${event.meet_link ? `
                  <a href="${event.meet_link}" style="display: inline-block; margin-top: 8px; color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500;">
                    Join Meeting →
                  </a>
                  ` : ''}
                </div>
              </div>
            </td>
          </tr>
          `).join('')}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <a href="https://www.iqonga.org/calendar" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                View Full Calendar
              </a>
              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px;">
                Daily digest from <strong style="color: #3b82f6;">Iqonga</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Build daily digest plain text
   */
  buildDailyDigestText(events) {
    const today = new Date().toLocaleDateString();

    let text = `📅 TODAY'S SCHEDULE\n\n`;
    text += `${today}\n\n`;
    text += `${events.length} meeting${events.length > 1 ? 's' : ''} scheduled:\n\n`;

    events.forEach((event, index) => {
      const time = new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      text += `${index + 1}. ${time} - ${event.summary}\n`;
      if (event.location) text += `   📍 ${event.location}\n`;
      if (event.meet_link) text += `   🎥 ${event.meet_link}\n`;
      text += `\n`;
    });

    text += `View full calendar: https://www.iqonga.org/calendar\n`;
    text += `\n---\nDaily digest from Iqonga\n`;

    return text;
  }

  /**
   * Send weekly previews (Sunday evening with next week's overview)
   */
  async sendWeeklyPreviews() {
    try {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Get users who should receive preview now
      const prefsResult = await database.query(`
        SELECT p.*, u.email, u.id as user_id
        FROM meeting_reminder_preferences p
        JOIN users u ON p.user_id = u.id
        WHERE p.enable_weekly_preview = true
        AND u.email IS NOT NULL
        AND p.weekly_preview_day = $1
        AND EXTRACT(HOUR FROM p.weekly_preview_time) = $2
        AND EXTRACT(MINUTE FROM p.weekly_preview_time) BETWEEN $3 AND $4
        AND NOT EXISTS (
          SELECT 1 FROM meeting_reminders_sent mrs
          WHERE mrs.user_id = p.user_id
          AND mrs.reminder_type = 'weekly_preview'
          AND mrs.sent_at >= CURRENT_DATE - INTERVAL '6 days'
        )
      `, [currentDay, currentHour, Math.max(0, currentMinute - 5), currentMinute + 5]);

      for (const pref of prefsResult.rows) {
        try {
          await this.sendWeeklyPreviewEmail(pref);
        } catch (error) {
          logger.error('Error sending weekly preview:', { userId: pref.user_id, error: error.message });
        }
      }
    } catch (error) {
      logger.error('Error in sendWeeklyPreviews:', error);
    }
  }

  /**
   * Send weekly preview email
   */
  async sendWeeklyPreviewEmail(pref) {
    const userId = pref.user_id;

    // Get next 7 days of events
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const eventsResult = await database.query(`
      SELECT * FROM calendar_events
      WHERE user_id = $1
      AND start_time >= $2
      AND start_time < $3
      AND status != 'cancelled'
      ORDER BY start_time ASC
    `, [userId, weekStart, weekEnd]);

    if (eventsResult.rows.length === 0) {
      logger.info('No events next week, skipping preview', { userId });
      return;
    }

    const events = eventsResult.rows;

    // Build email
    const subject = `📆 Week Ahead: ${events.length} meeting${events.length > 1 ? 's' : ''} scheduled`;
    const html = this.buildWeeklyPreviewHTML(events);
    const body = this.buildWeeklyPreviewText(events);

    // Send email
    await GmailService.sendEmail(userId, {
      to: pref.email,
      subject: subject,
      body: body,
      html: html
    });

    // Track that we sent this preview
    await database.query(`
      INSERT INTO meeting_reminders_sent (user_id, reminder_type)
      VALUES ($1, 'weekly_preview')
    `, [userId]);

    logger.info('Weekly preview sent', { userId, eventCount: events.length });
  }

  /**
   * Build weekly preview HTML (similar to daily digest but grouped by day)
   */
  buildWeeklyPreviewHTML(events) {
    // Group events by day
    const eventsByDay = {};
    events.forEach(event => {
      const day = new Date(event.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(event);
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Preview</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📆 Week Ahead
              </h1>
              <p style="margin: 10px 0 0 0; color: #fae8ff; font-size: 14px;">
                Your schedule for the next 7 days
              </p>
            </td>
          </tr>

          <!-- Event Count -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
                ${events.length} meeting${events.length > 1 ? 's' : ''} scheduled
              </p>
            </td>
          </tr>

          <!-- Events by Day -->
          ${Object.keys(eventsByDay).map((day, dayIndex) => `
          <tr>
            <td style="padding: 25px 30px; ${dayIndex < Object.keys(eventsByDay).length - 1 ? 'border-bottom: 2px solid #e5e7eb;' : ''}">
              <h3 style="margin: 0 0 15px 0; color: #8b5cf6; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                ${day}
              </h3>
              ${eventsByDay[day].map((event, eventIndex) => `
              <div style="margin-bottom: ${eventIndex < eventsByDay[day].length - 1 ? '15px' : '0'}; padding: 12px; background-color: #faf5ff; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                <div style="display: flex; align-items: start;">
                  <div style="flex-shrink: 0; width: 60px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                      ${new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style="flex: 1; margin-left: 15px;">
                    <p style="margin: 0; color: #111827; font-size: 15px; font-weight: 600;">
                      ${event.summary}
                    </p>
                    ${event.location ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">📍 ${event.location}</p>` : ''}
                  </div>
                </div>
              </div>
              `).join('')}
            </td>
          </tr>
          `).join('')}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <a href="https://www.iqonga.org/calendar" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                View Full Calendar
              </a>
              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px;">
                Weekly preview from <strong style="color: #8b5cf6;">Iqonga</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Build weekly preview plain text
   */
  buildWeeklyPreviewText(events) {
    // Group events by day
    const eventsByDay = {};
    events.forEach(event => {
      const day = new Date(event.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(event);
    });

    let text = `📆 WEEK AHEAD\n\n`;
    text += `Your schedule for the next 7 days\n\n`;
    text += `${events.length} meeting${events.length > 1 ? 's' : ''} scheduled:\n\n`;

    Object.keys(eventsByDay).forEach((day, dayIndex) => {
      text += `${day.toUpperCase()}\n`;
      text += `${'='.repeat(day.length)}\n\n`;
      
      eventsByDay[day].forEach(event => {
        const time = new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        text += `  ${time} - ${event.summary}\n`;
        if (event.location) text += `  📍 ${event.location}\n`;
        text += `\n`;
      });
      
      if (dayIndex < Object.keys(eventsByDay).length - 1) {
        text += `\n`;
      }
    });

    text += `View full calendar: https://www.iqonga.org/calendar\n`;
    text += `\n---\nWeekly preview from Iqonga\n`;

    return text;
  }

  /**
   * Get user reminder preferences (creates default if not exists)
   */
  async getUserPreferences(userId) {
    try {
      let prefsResult = await database.query(
        'SELECT * FROM meeting_reminder_preferences WHERE user_id = $1',
        [userId]
      );

      if (prefsResult.rows.length === 0) {
        // Create default preferences
        prefsResult = await database.query(`
          INSERT INTO meeting_reminder_preferences (user_id)
          VALUES ($1)
          RETURNING *
        `, [userId]);
      }

      return prefsResult.rows[0];
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user reminder preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const fields = [];
      const values = [userId];
      let paramIndex = 2;

      // Build dynamic UPDATE query
      const allowedFields = [
        'enable_pre_meeting_reminders',
        'reminder_minutes_before',
        'enable_daily_digest',
        'daily_digest_time',
        'daily_digest_timezone',
        'enable_weekly_preview',
        'weekly_preview_day',
        'weekly_preview_time',
        'include_ai_insights'
      ];

      for (const field of allowedFields) {
        if (preferences[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(preferences[field]);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE meeting_reminder_preferences
        SET ${fields.join(', ')}
        WHERE user_id = $1
        RETURNING *
      `;

      const result = await database.query(query, values);

      if (result.rows.length === 0) {
        // Create if not exists
        return this.getUserPreferences(userId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }
}

module.exports = new MeetingReminderService();

