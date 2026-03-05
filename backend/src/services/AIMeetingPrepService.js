const OpenAI = require('openai');
const database = require('../database/connection');
const logger = require('../utils/logger');
const GmailService = require('./GmailService');

class AIMeetingPrepService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate AI meeting prep for an event
   */
  async generateMeetingPrep(userId, eventIdOrProviderId) {
    try {
      logger.info('Generating AI meeting prep', { userId, eventId: eventIdOrProviderId });

      // 1. Get event details (handles both internal ID and provider_event_id)
      const event = await this.getEventDetails(userId, eventIdOrProviderId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Use internal event ID for database operations
      const eventId = event.id;

      // Check if prep already exists and is not expired
      const existingPrep = await this.getExistingPrep(userId, eventId);
      if (existingPrep && new Date(existingPrep.expires_at) > new Date()) {
        logger.info('Returning cached meeting prep', { userId, eventId });
        return this.formatPrepResponse(existingPrep);
      }

      // 2. Gather context
      const context = await this.gatherMeetingContext(userId, event);

      // 3. Generate AI brief using OpenAI
      const aiBrief = await this.generateAIBrief(event, context);

      // 4. Save to database
      const prep = await this.saveMeetingPrep(userId, eventId, context, aiBrief);

      logger.info('AI meeting prep generated successfully', { userId, eventId });
      return this.formatPrepResponse(prep);

    } catch (error) {
      logger.error('Failed to generate meeting prep:', error);
      throw error;
    }
  }

  /**
   * Get event details from database by internal ID or provider_event_id
   */
  async getEventDetails(userId, eventId) {
    try {
      // First, try as integer (internal ID)
      if (!isNaN(eventId) && Number.isInteger(Number(eventId))) {
        const result = await database.query(
          `SELECT * FROM calendar_events 
           WHERE id = $1 AND user_id = $2`,
          [parseInt(eventId), userId]
        );

        if (result.rows[0]) {
          return result.rows[0];
        }
      }

      // If not found or not an integer, try as provider_event_id (Google Calendar ID)
      const result = await database.query(
        `SELECT * FROM calendar_events 
         WHERE provider_event_id = $1 AND user_id = $2`,
        [eventId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get event details:', error);
      throw error;
    }
  }

  /**
   * Get internal event ID from provider_event_id or return if already internal
   */
  async getInternalEventId(userId, eventIdOrProviderId) {
    const event = await this.getEventDetails(userId, eventIdOrProviderId);
    if (!event) {
      return null;
    }
    return event.id; // Return internal database ID
  }

  /**
   * Get existing prep if not expired
   */
  async getExistingPrep(userId, eventIdOrProviderId) {
    try {
      // Get internal event ID first (handles both ID types)
      const internalEventId = await this.getInternalEventId(userId, eventIdOrProviderId);
      if (!internalEventId) {
        return null;
      }

      const result = await database.query(
        `SELECT * FROM ai_meeting_prep 
         WHERE event_id = $1 AND user_id = $2 
         AND expires_at > CURRENT_TIMESTAMP`,
        [internalEventId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get existing prep:', error);
      return null;
    }
  }

  /**
   * Gather all context needed for meeting prep
   */
  async gatherMeetingContext(userId, event) {
    try {
      const context = {
        attendeeContext: [],
        relatedEmails: [],
        pastMeetings: []
      };

      // Parse attendees
      const attendees = typeof event.attendees === 'string' 
        ? JSON.parse(event.attendees) 
        : event.attendees || [];

      if (attendees.length === 0) {
        return context;
      }

      // Get attendee emails
      const attendeeEmails = attendees.map(a => a.email || a).filter(Boolean);

      // 1. Find related emails (past 30 days)
      context.relatedEmails = await this.findRelatedEmails(userId, attendeeEmails, event);

      // 2. Find past meetings with same attendees
      context.pastMeetings = await this.findPastMeetings(userId, attendeeEmails, event.id);

      // 3. Build attendee context
      context.attendeeContext = await this.buildAttendeeContext(userId, attendeeEmails, context);

      return context;
    } catch (error) {
      logger.error('Failed to gather meeting context:', error);
      return {
        attendeeContext: [],
        relatedEmails: [],
        pastMeetings: []
      };
    }
  }

  /**
   * Find related emails from Gmail
   */
  async findRelatedEmails(userId, attendeeEmails, event) {
    try {
      if (attendeeEmails.length === 0) return [];

      // Search for emails from/to attendees in the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const emailQuery = `
        SELECT id, subject, sender, received_at, snippet
        FROM email_messages
        WHERE user_id = $1
        AND received_at >= $2
        AND (
          sender = ANY($3)
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(recipients, ARRAY[]::TEXT[])) AS recipient
            WHERE recipient = ANY($3)
          )
        )
        ORDER BY received_at DESC
        LIMIT 10
      `;

      const result = await database.query(emailQuery, [
        userId,
        thirtyDaysAgo,
        attendeeEmails
      ]);

      return result.rows.map(row => ({
        subject: row.subject,
        from: row.sender,
        date: row.received_at,
        snippet: row.snippet || ''
      }));

    } catch (error) {
      logger.error('Failed to find related emails:', error);
      return [];
    }
  }

  /**
   * Find past meetings with same attendees
   */
  async findPastMeetings(userId, attendeeEmails, currentEventId) {
    try {
      if (attendeeEmails.length === 0) return [];

      // Find past meetings where any of the attendees were present
      const result = await database.query(
        `SELECT id, summary, start_time, end_time, location, attendees
         FROM calendar_events
         WHERE user_id = $1
         AND id != $2
         AND start_time < CURRENT_TIMESTAMP
         AND attendees::text ILIKE ANY($3)
         ORDER BY start_time DESC
         LIMIT 5`,
        [
          userId,
          currentEventId,
          attendeeEmails.map(email => `%${email}%`)
        ]
      );

      return result.rows.map(row => ({
        title: row.summary,
        date: row.start_time,
        location: row.location,
        attendees: typeof row.attendees === 'string' 
          ? JSON.parse(row.attendees) 
          : row.attendees
      }));

    } catch (error) {
      logger.error('Failed to find past meetings:', error);
      return [];
    }
  }

  /**
   * Build context for each attendee
   */
  async buildAttendeeContext(userId, attendeeEmails, context) {
    try {
      return attendeeEmails.map(email => {
        // Count past meetings with this attendee
        const pastMeetingsWithAttendee = context.pastMeetings.filter(meeting => {
          const meetingAttendees = meeting.attendees || [];
          return meetingAttendees.some(a => (a.email || a) === email);
        });

        // Count emails from this attendee
        const emailsFromAttendee = context.relatedEmails.filter(
          emailItem => emailItem.from === email
        );

        // Find most recent interaction
        let lastInteraction = null;
        if (pastMeetingsWithAttendee.length > 0) {
          lastInteraction = new Date(pastMeetingsWithAttendee[0].date);
        } else if (emailsFromAttendee.length > 0) {
          lastInteraction = new Date(emailsFromAttendee[0].date);
        }

        return {
          email,
          pastMeetingsCount: pastMeetingsWithAttendee.length,
          recentEmailsCount: emailsFromAttendee.length,
          lastInteraction: lastInteraction ? lastInteraction.toISOString() : null
        };
      });

    } catch (error) {
      logger.error('Failed to build attendee context:', error);
      return [];
    }
  }

  /**
   * Generate AI brief using OpenAI
   */
  async generateAIBrief(event, context) {
    try {
      const prompt = this.buildAIPrompt(event, context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [
          {
            role: 'system',
            content: 'You are an AI meeting preparation assistant. Generate helpful, actionable meeting briefs based on the provided context. Be concise and practical.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        meetingSummary: result.meeting_summary || '',
        discussionTopics: result.discussion_topics || [],
        suggestedQuestions: result.suggested_questions || [],
        preparationChecklist: result.preparation_checklist || [],
        keyContext: result.key_context || '',
        estimatedPrepTime: result.estimated_prep_time || 15
      };

    } catch (error) {
      logger.error('Failed to generate AI brief:', error);
      // Return default response if AI fails
      return {
        meetingSummary: `Meeting about: ${event.summary}`,
        discussionTopics: ['Review meeting agenda', 'Discuss key objectives', 'Plan next steps'],
        suggestedQuestions: ['What are the main goals?', 'Are there any blockers?', 'What are the next action items?'],
        preparationChecklist: ['Review meeting description', 'Prepare questions', 'Check calendar for conflicts'],
        keyContext: 'No additional context available',
        estimatedPrepTime: 10
      };
    }
  }

  /**
   * Build prompt for OpenAI
   */
  buildAIPrompt(event, context) {
    const attendees = typeof event.attendees === 'string' 
      ? JSON.parse(event.attendees) 
      : event.attendees || [];

    let prompt = `Generate a comprehensive meeting preparation brief in JSON format.

MEETING DETAILS:
- Title: ${event.summary}
- Date: ${event.start_time}
- Duration: ${this.calculateDuration(event.start_time, event.end_time)} minutes
- Location: ${event.location || 'Not specified'}
- Description: ${event.description || 'No description'}

ATTENDEES (${attendees.length}):
${attendees.map(a => `- ${a.email || a}`).join('\n')}

`;

    if (context.attendeeContext.length > 0) {
      prompt += `\nATTENDEE CONTEXT:\n`;
      context.attendeeContext.forEach(ctx => {
        prompt += `- ${ctx.email}: ${ctx.pastMeetingsCount} past meetings, ${ctx.recentEmailsCount} recent emails`;
        if (ctx.lastInteraction) {
          const daysSince = Math.floor((Date.now() - new Date(ctx.lastInteraction).getTime()) / (1000 * 60 * 60 * 24));
          prompt += `, last interaction ${daysSince} days ago`;
        }
        prompt += '\n';
      });
    }

    if (context.relatedEmails.length > 0) {
      prompt += `\nRELATED EMAILS (${context.relatedEmails.length}):\n`;
      context.relatedEmails.slice(0, 5).forEach(email => {
        prompt += `- "${email.subject}" from ${email.from}\n`;
      });
    }

    if (context.pastMeetings.length > 0) {
      prompt += `\nPAST MEETINGS (${context.pastMeetings.length}):\n`;
      context.pastMeetings.slice(0, 3).forEach(meeting => {
        prompt += `- "${meeting.title}" on ${new Date(meeting.date).toLocaleDateString()}\n`;
      });
    }

    prompt += `\n
Generate a JSON object with the following structure:
{
  "meeting_summary": "A brief 1-2 sentence summary of what this meeting is about",
  "discussion_topics": ["topic 1", "topic 2", "topic 3"],
  "suggested_questions": ["question 1", "question 2", "question 3"],
  "preparation_checklist": ["task 1", "task 2", "task 3"],
  "key_context": "A paragraph with key context and background information",
  "estimated_prep_time": 15
}

Provide 3-5 discussion topics, 3-5 suggested questions, and 3-5 checklist items.
Estimated prep time should be in minutes (5-30).`;

    return prompt;
  }

  /**
   * Calculate meeting duration in minutes
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / (1000 * 60));
  }

  /**
   * Save meeting prep to database
   */
  async saveMeetingPrep(userId, eventId, context, aiBrief) {
    try {
      const result = await database.query(
        `INSERT INTO ai_meeting_prep (
          event_id, user_id, meeting_summary, attendee_context,
          related_emails, past_meetings, discussion_topics,
          suggested_questions, preparation_checklist, key_context,
          estimated_prep_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (event_id, user_id)
        DO UPDATE SET
          meeting_summary = EXCLUDED.meeting_summary,
          attendee_context = EXCLUDED.attendee_context,
          related_emails = EXCLUDED.related_emails,
          past_meetings = EXCLUDED.past_meetings,
          discussion_topics = EXCLUDED.discussion_topics,
          suggested_questions = EXCLUDED.suggested_questions,
          preparation_checklist = EXCLUDED.preparation_checklist,
          key_context = EXCLUDED.key_context,
          estimated_prep_time = EXCLUDED.estimated_prep_time,
          generated_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          eventId,
          userId,
          aiBrief.meetingSummary,
          JSON.stringify(context.attendeeContext),
          JSON.stringify(context.relatedEmails),
          JSON.stringify(context.pastMeetings),
          aiBrief.discussionTopics,
          aiBrief.suggestedQuestions,
          aiBrief.preparationChecklist,
          aiBrief.keyContext,
          aiBrief.estimatedPrepTime
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save meeting prep:', error);
      throw error;
    }
  }

  /**
   * Format prep response for frontend
   */
  formatPrepResponse(prep) {
    return {
      id: prep.id,
      eventId: prep.event_id,
      meetingSummary: prep.meeting_summary,
      attendeeContext: typeof prep.attendee_context === 'string' 
        ? JSON.parse(prep.attendee_context) 
        : prep.attendee_context,
      relatedEmails: typeof prep.related_emails === 'string' 
        ? JSON.parse(prep.related_emails) 
        : prep.related_emails,
      pastMeetings: typeof prep.past_meetings === 'string' 
        ? JSON.parse(prep.past_meetings) 
        : prep.past_meetings,
      discussionTopics: prep.discussion_topics || [],
      suggestedQuestions: prep.suggested_questions || [],
      preparationChecklist: prep.preparation_checklist || [],
      keyContext: prep.key_context,
      estimatedPrepTime: prep.estimated_prep_time,
      generatedAt: prep.generated_at,
      expiresAt: prep.expires_at
    };
  }

  /**
   * Get meeting prep by event ID
   */
  async getMeetingPrep(userId, eventIdOrProviderId) {
    try {
      // getExistingPrep now handles both ID types internally
      const prep = await this.getExistingPrep(userId, eventIdOrProviderId);
      
      if (!prep) {
        return null;
      }

      return this.formatPrepResponse(prep);
    } catch (error) {
      logger.error('Failed to get meeting prep:', error);
      throw error;
    }
  }

  /**
   * Delete meeting prep
   */
  async deleteMeetingPrep(userId, eventId) {
    try {
      await database.query(
        'DELETE FROM ai_meeting_prep WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      logger.info('Meeting prep deleted', { userId, eventId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete meeting prep:', error);
      throw error;
    }
  }

  /**
   * Email meeting prep to user
   */
  async emailMeetingPrep(userId, eventId) {
    try {
      logger.info('Emailing meeting prep', { userId, eventId });

      // Get event details
      const event = await this.getEventDetails(userId, eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get or generate meeting prep
      let prep = await this.getExistingPrep(userId, eventId);
      if (!prep || new Date(prep.expires_at) < new Date()) {
        // Generate new prep if not exists or expired
        const generatedPrep = await this.generateMeetingPrep(userId, eventId);
        prep = await this.getExistingPrep(userId, eventId);
      }

      // Get user email
      const userResult = await database.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userEmail = userResult.rows[0].email;
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Get user's Gmail account
      const gmailAccount = await database.query(
        'SELECT * FROM user_email_accounts WHERE user_id = $1 AND provider = $2 AND is_active = true',
        [userId, 'gmail']
      );

      if (gmailAccount.rows.length === 0) {
        throw new Error('Gmail account not connected');
      }

      // Format email content
      const emailHtml = this.buildEmailTemplate(event, prep);
      const emailText = this.buildEmailText(event, prep);

      // Calculate time until meeting
      const timeUntilMeeting = this.getTimeUntilMeeting(event.start_time);

      // Send email via Gmail
      const subject = `🤖 AI Meeting Prep: ${event.summary} ${timeUntilMeeting}`;
      
      await GmailService.sendEmail(userId, {
        to: userEmail,
        subject: subject,
        body: emailText,
        html: emailHtml
      });

      logger.info('Meeting prep emailed successfully', { userId, eventId, to: userEmail });

      return {
        success: true,
        message: 'Meeting prep sent to your email',
        emailSentTo: userEmail
      };

    } catch (error) {
      logger.error('Failed to email meeting prep:', error);
      throw error;
    }
  }

  /**
   * Build HTML email template
   */
  buildEmailTemplate(event, prep) {
    const formattedPrep = this.formatPrepResponse(prep);
    const startTime = new Date(event.start_time).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Meeting Prep</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🤖 AI Meeting Prep
              </h1>
              <p style="margin: 10px 0 0 0; color: #fce7f3; font-size: 14px;">
                Powered by Iqonga
              </p>
            </td>
          </tr>

          <!-- Meeting Title -->
          <tr>
            <td style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
              <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 24px; font-weight: bold;">
                ${event.summary}
              </h2>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                📅 ${startTime}
              </p>
              ${event.location ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">📍 ${event.location}</p>` : ''}
            </td>
          </tr>

          <!-- Meeting Summary -->
          <tr>
            <td style="padding: 30px; background-color: #faf5ff;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                📝 MEETING SUMMARY
              </h3>
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                ${formattedPrep.meetingSummary}
              </p>
            </td>
          </tr>

          ${formattedPrep.keyContext ? `
          <!-- Key Context -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                🔑 KEY CONTEXT
              </h3>
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                ${formattedPrep.keyContext}
              </p>
            </td>
          </tr>
          ` : ''}

          ${formattedPrep.discussionTopics.length > 0 ? `
          <!-- Discussion Topics -->
          <tr>
            <td style="padding: 30px; background-color: #faf5ff; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                💬 DISCUSSION TOPICS
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                ${formattedPrep.discussionTopics.map(topic => `<li>${topic}</li>`).join('')}
              </ol>
            </td>
          </tr>
          ` : ''}

          ${formattedPrep.suggestedQuestions.length > 0 ? `
          <!-- Suggested Questions -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                ❓ SUGGESTED QUESTIONS
              </h3>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                ${formattedPrep.suggestedQuestions.map(q => `<li>${q}</li>`).join('')}
              </ol>
            </td>
          </tr>
          ` : ''}

          ${formattedPrep.preparationChecklist.length > 0 ? `
          <!-- Preparation Checklist -->
          <tr>
            <td style="padding: 30px; background-color: #faf5ff; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                ✅ PREPARATION CHECKLIST
              </h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8; list-style-type: none;">
                ${formattedPrep.preparationChecklist.map(item => `<li style="margin-bottom: 8px;">☐ ${item}</li>`).join('')}
              </ul>
            </td>
          </tr>
          ` : ''}

          ${formattedPrep.attendeeContext.length > 0 ? `
          <!-- Attendee Insights -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                👥 ATTENDEE INSIGHTS
              </h3>
              ${formattedPrep.attendeeContext.map(att => `
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">
                  <strong>${att.email}</strong> - ${att.pastMeetingsCount} past meetings, ${att.recentEmailsCount} recent emails
                  ${att.lastInteraction ? ` • Last interaction: ${new Date(att.lastInteraction).toLocaleDateString()}` : ''}
                </p>
              `).join('')}
            </td>
          </tr>
          ` : ''}

          ${formattedPrep.relatedEmails.length > 0 ? `
          <!-- Related Emails -->
          <tr>
            <td style="padding: 30px; background-color: #faf5ff; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #7e22ce; font-size: 16px; font-weight: bold;">
                📧 RELATED EMAILS (${formattedPrep.relatedEmails.length})
              </h3>
              ${formattedPrep.relatedEmails.slice(0, 5).map(email => `
                <div style="margin-bottom: 12px; padding: 10px; background-color: #ffffff; border-radius: 6px;">
                  <p style="margin: 0 0 5px 0; color: #111827; font-size: 14px; font-weight: 600;">
                    ${email.subject}
                  </p>
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    From: ${email.from} • ${new Date(email.date).toLocaleDateString()}
                  </p>
                </div>
              `).join('')}
            </td>
          </tr>
          ` : ''}

          <!-- Prep Time -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                ⏱️ <strong>Estimated Prep Time:</strong> ${formattedPrep.estimatedPrepTime} minutes
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                Generated by <strong style="color: #7e22ce;">Iqonga</strong> • ${new Date(formattedPrep.generatedAt).toLocaleString()}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                This brief expires in 24 hours. Generate a fresh one anytime from your calendar.
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

    return html;
  }

  /**
   * Build plain text email
   */
  buildEmailText(event, prep) {
    const formattedPrep = this.formatPrepResponse(prep);
    const startTime = new Date(event.start_time).toLocaleString();

    let text = `🤖 AI MEETING PREP\n\n`;
    text += `${event.summary}\n`;
    text += `📅 ${startTime}\n`;
    if (event.location) text += `📍 ${event.location}\n`;
    text += `\n`;
    
    text += `📝 MEETING SUMMARY\n`;
    text += `${formattedPrep.meetingSummary}\n\n`;

    if (formattedPrep.keyContext) {
      text += `🔑 KEY CONTEXT\n`;
      text += `${formattedPrep.keyContext}\n\n`;
    }

    if (formattedPrep.discussionTopics.length > 0) {
      text += `💬 DISCUSSION TOPICS\n`;
      formattedPrep.discussionTopics.forEach((topic, i) => {
        text += `${i + 1}. ${topic}\n`;
      });
      text += `\n`;
    }

    if (formattedPrep.suggestedQuestions.length > 0) {
      text += `❓ SUGGESTED QUESTIONS\n`;
      formattedPrep.suggestedQuestions.forEach((q, i) => {
        text += `${i + 1}. ${q}\n`;
      });
      text += `\n`;
    }

    if (formattedPrep.preparationChecklist.length > 0) {
      text += `✅ PREPARATION CHECKLIST\n`;
      formattedPrep.preparationChecklist.forEach((item) => {
        text += `☐ ${item}\n`;
      });
      text += `\n`;
    }

    if (formattedPrep.attendeeContext.length > 0) {
      text += `👥 ATTENDEE INSIGHTS\n`;
      formattedPrep.attendeeContext.forEach(att => {
        text += `${att.email} - ${att.pastMeetingsCount} past meetings, ${att.recentEmailsCount} recent emails`;
        if (att.lastInteraction) {
          text += ` • Last: ${new Date(att.lastInteraction).toLocaleDateString()}`;
        }
        text += `\n`;
      });
      text += `\n`;
    }

    if (formattedPrep.relatedEmails.length > 0) {
      text += `📧 RELATED EMAILS (${formattedPrep.relatedEmails.length})\n`;
      formattedPrep.relatedEmails.slice(0, 5).forEach(email => {
        text += `"${email.subject}" from ${email.from} • ${new Date(email.date).toLocaleDateString()}\n`;
      });
      text += `\n`;
    }

    text += `⏱️ Estimated Prep Time: ${formattedPrep.estimatedPrepTime} minutes\n`;
    text += `\n`;
    text += `---\n`;
    text += `Generated by Iqonga • ${new Date(formattedPrep.generatedAt).toLocaleString()}\n`;

    return text;
  }

  /**
   * Get time until meeting (human readable)
   */
  getTimeUntilMeeting(startTime) {
    const now = new Date();
    const meetingTime = new Date(startTime);
    const diffMs = meetingTime - now;

    if (diffMs < 0) return '(Past Event)';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `(in ${diffMinutes} minutes)`;
    } else if (diffHours < 24) {
      return `(in ${diffHours} hours)`;
    } else if (diffDays === 1) {
      return `(tomorrow)`;
    } else if (diffDays < 7) {
      return `(in ${diffDays} days)`;
    } else {
      return '';
    }
  }
}

module.exports = new AIMeetingPrepService();

