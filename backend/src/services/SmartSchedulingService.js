const database = require('../database/connection');
const logger = require('../utils/logger');
const OpenAI = require('openai');

class SmartSchedulingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze user's calendar and generate insights
   */
  async analyzeCalendar(userId, options = {}) {
    try {
      const { daysBack = 30, daysAhead = 7 } = options;

      logger.info('Analyzing calendar for user', { userId });

      // 1. Analyze historical patterns
      const patterns = await this.analyzeSchedulingPatterns(userId, daysBack);

      // 2. Detect current conflicts
      const conflicts = await this.detectConflicts(userId, daysAhead);

      // 3. Calculate calendar health
      const health = await this.calculateCalendarHealth(userId);

      // 4. Generate AI suggestions
      const suggestions = await this.generateSuggestions(userId, patterns, conflicts, health);

      // 5. Save metrics
      await this.saveHealthMetrics(userId, health);

      return {
        patterns,
        conflicts,
        health,
        suggestions
      };

    } catch (error) {
      logger.error('Failed to analyze calendar:', error);
      throw error;
    }
  }

  /**
   * Analyze historical scheduling patterns
   */
  async analyzeSchedulingPatterns(userId, daysBack = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get historical events
      const eventsResult = await database.query(`
        SELECT 
          EXTRACT(HOUR FROM start_time) as hour,
          EXTRACT(DOW FROM start_time) as day_of_week,
          EXTRACT(EPOCH FROM (end_time - start_time))/60 as duration_minutes,
          location,
          COUNT(*) as frequency
        FROM calendar_events
        WHERE user_id = $1
        AND start_time >= $2
        AND start_time < NOW()
        AND status != 'cancelled'
        GROUP BY 
          EXTRACT(HOUR FROM start_time),
          EXTRACT(DOW FROM start_time),
          EXTRACT(EPOCH FROM (end_time - start_time))/60,
          location
        ORDER BY frequency DESC
      `, [userId, startDate]);

      const events = eventsResult.rows;

      // Calculate patterns
      const hourFrequency = {};
      const dayFrequency = {};
      const durations = [];
      const locations = {};

      events.forEach(event => {
        const hour = parseInt(event.hour);
        const day = parseInt(event.day_of_week);
        const duration = parseFloat(event.duration_minutes);
        const location = event.location;

        hourFrequency[hour] = (hourFrequency[hour] || 0) + parseInt(event.frequency);
        dayFrequency[day] = (dayFrequency[day] || 0) + parseInt(event.frequency);
        
        for (let i = 0; i < event.frequency; i++) {
          durations.push(duration);
        }

        if (location) {
          locations[location] = (locations[location] || 0) + parseInt(event.frequency);
        }
      });

      // Find preferred hours (top 5)
      const preferredHours = Object.entries(hourFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour]) => parseInt(hour));

      // Find most common day
      const mostCommonDay = Object.entries(dayFrequency)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      // Calculate average duration
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 60;

      // Top locations
      const commonLocations = Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([loc]) => loc);

      // Calculate avg meetings per day
      const totalMeetings = durations.length;
      const avgMeetingsPerDay = (totalMeetings / daysBack).toFixed(2);

      // Save patterns to database
      await database.query(`
        INSERT INTO user_scheduling_patterns (
          user_id, preferred_hours, avg_meetings_per_day,
          avg_meeting_duration_minutes, most_common_day,
          common_locations, last_analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          preferred_hours = EXCLUDED.preferred_hours,
          avg_meetings_per_day = EXCLUDED.avg_meetings_per_day,
          avg_meeting_duration_minutes = EXCLUDED.avg_meeting_duration_minutes,
          most_common_day = EXCLUDED.most_common_day,
          common_locations = EXCLUDED.common_locations,
          last_analyzed_at = EXCLUDED.last_analyzed_at
      `, [
        userId,
        JSON.stringify(preferredHours),
        parseFloat(avgMeetingsPerDay),
        avgDuration,
        mostCommonDay ? parseInt(mostCommonDay) : null,
        JSON.stringify(commonLocations)
      ]);

      return {
        preferredHours,
        avgMeetingsPerDay: parseFloat(avgMeetingsPerDay),
        avgDuration,
        mostCommonDay: mostCommonDay ? parseInt(mostCommonDay) : null,
        commonLocations,
        totalMeetingsAnalyzed: totalMeetings
      };

    } catch (error) {
      logger.error('Failed to analyze patterns:', error);
      return null;
    }
  }

  /**
   * Detect scheduling conflicts
   */
  async detectConflicts(userId, daysAhead = 7) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      // Get upcoming events
      const eventsResult = await database.query(`
        SELECT *
        FROM calendar_events
        WHERE user_id = $1
        AND start_time >= NOW()
        AND start_time <= $2
        AND status != 'cancelled'
        ORDER BY start_time
      `, [userId, endDate]);

      const events = eventsResult.rows;
      const conflicts = [];

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Check for overlaps with next events
        for (let j = i + 1; j < events.length; j++) {
          const nextEvent = events[j];
          const nextStart = new Date(nextEvent.start_time);
          const nextEnd = new Date(nextEvent.end_time);

          // Overlap detection
          if (eventStart < nextEnd && nextStart < eventEnd) {
            conflicts.push({
              type: 'overlap',
              severity: 'critical',
              eventId: event.id,
              conflictingEventId: nextEvent.id,
              description: `"${event.summary}" overlaps with "${nextEvent.summary}"`,
              suggestedAction: 'Reschedule one of these meetings'
            });
          }
          // Back-to-back detection (less than 5 min gap)
          else if (nextStart - eventEnd < 5 * 60 * 1000 && nextStart > eventEnd) {
            conflicts.push({
              type: 'back_to_back',
              severity: 'medium',
              eventId: event.id,
              conflictingEventId: nextEvent.id,
              description: `"${event.summary}" and "${nextEvent.summary}" are back-to-back with no buffer`,
              suggestedAction: 'Add 10-15 minute buffer between meetings'
            });
          }
        }

        // Travel time check (location changes)
        if (i > 0) {
          const prevEvent = events[i - 1];
          const prevEnd = new Date(prevEvent.end_time);
          const timeBetween = (eventStart - prevEnd) / (1000 * 60); // minutes

          if (prevEvent.location && event.location && 
              prevEvent.location !== event.location &&
              !prevEvent.location.toLowerCase().includes('virtual') &&
              !event.location.toLowerCase().includes('virtual') &&
              timeBetween < 30) {
            conflicts.push({
              type: 'travel_time',
              severity: 'high',
              eventId: event.id,
              conflictingEventId: prevEvent.id,
              description: `Only ${Math.round(timeBetween)} minutes to travel from "${prevEvent.location}" to "${event.location}"`,
              suggestedAction: `Allow at least 30 minutes for travel between locations`
            });
          }
        }
      }

      // Check for overloaded days
      const dayGroups = {};
      events.forEach(event => {
        const day = new Date(event.start_time).toDateString();
        dayGroups[day] = (dayGroups[day] || 0) + 1;
      });

      Object.entries(dayGroups).forEach(([day, count]) => {
        if (count >= 6) {
          conflicts.push({
            type: 'overload',
            severity: 'high',
            description: `${count} meetings scheduled on ${day}`,
            suggestedAction: 'Consider rescheduling some meetings to balance your week'
          });
        }
      });

      // Save conflicts to database
      for (const conflict of conflicts) {
        await database.query(`
          INSERT INTO scheduling_conflicts (
            user_id, event_id, conflict_type, severity,
            conflicting_event_id, description, suggested_action
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          userId,
          conflict.eventId || null,
          conflict.type,
          conflict.severity,
          conflict.conflictingEventId || null,
          conflict.description,
          conflict.suggestedAction
        ]);
      }

      return conflicts;

    } catch (error) {
      logger.error('Failed to detect conflicts:', error);
      return [];
    }
  }

  /**
   * Calculate calendar health metrics
   */
  async calculateCalendarHealth(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's events
      const eventsResult = await database.query(`
        SELECT 
          start_time,
          end_time,
          EXTRACT(EPOCH FROM (end_time - start_time))/3600 as duration_hours
        FROM calendar_events
        WHERE user_id = $1
        AND start_time >= $2
        AND start_time < $3
        AND status != 'cancelled'
        ORDER BY start_time
      `, [userId, today, tomorrow]);

      const events = eventsResult.rows;

      // Calculate metrics
      const totalMeetings = events.length;
      const totalHours = events.reduce((sum, e) => sum + parseFloat(e.duration_hours), 0);

      // Count back-to-back meetings
      let backToBack = 0;
      for (let i = 0; i < events.length - 1; i++) {
        const gap = (new Date(events[i + 1].start_time) - new Date(events[i].end_time)) / (1000 * 60);
        if (gap < 5) backToBack++;
      }

      // Get active conflicts count
      const conflictsResult = await database.query(`
        SELECT COUNT(*) as count
        FROM scheduling_conflicts
        WHERE user_id = $1
        AND status = 'active'
      `, [userId]);

      const conflictsCount = parseInt(conflictsResult.rows[0]?.count || 0);

      // Calculate health scores (0-100)
      const balanceScore = Math.max(0, Math.min(100, 100 - (totalHours * 10))); // Penalize long meeting days
      const focusTimeScore = Math.max(0, Math.min(100, (8 - totalHours) * 12.5)); // Reward free time
      const efficiencyScore = Math.max(0, Math.min(100, 100 - (backToBack * 20))); // Penalize back-to-back
      const overallScore = Math.round((balanceScore + focusTimeScore + efficiencyScore) / 3);

      return {
        totalMeetings,
        totalHours: parseFloat(totalHours.toFixed(2)),
        backToBackMeetings: backToBack,
        conflictsCount,
        overallHealthScore: overallScore,
        balanceScore: Math.round(balanceScore),
        focusTimeScore: Math.round(focusTimeScore),
        efficiencyScore: Math.round(efficiencyScore)
      };

    } catch (error) {
      logger.error('Failed to calculate health:', error);
      return null;
    }
  }

  /**
   * Generate AI-powered scheduling suggestions
   */
  async generateSuggestions(userId, patterns, conflicts, health) {
    try {
      const suggestions = [];

      // Suggestion 1: Block focus time if low focus time score
      if (health && health.focusTimeScore < 50) {
        suggestions.push({
          type: 'block_focus',
          priority: 'high',
          title: 'Block Time for Deep Work',
          description: `You have only ${8 - health.totalHours} hours of unscheduled time today. Consider blocking 2-3 hours for focused work.`,
          reasoning: 'Research shows you need at least 4 hours of uninterrupted time per day for deep work.',
          suggestedAction: {
            action: 'block_time',
            hours: patterns?.preferredHours?.filter(h => h >= 9 && h <= 17) || [9, 10, 14, 15],
            duration: 120 // minutes
          }
        });
      }

      // Suggestion 2: Reduce meeting load if overloaded
      if (health && health.totalMeetings >= 6) {
        suggestions.push({
          type: 'reduce_load',
          priority: 'high',
          title: 'Too Many Meetings Today',
          description: `You have ${health.totalMeetings} meetings scheduled. Consider declining or rescheduling non-essential meetings.`,
          reasoning: 'Studies show productivity drops significantly after 5 meetings per day.',
          suggestedAction: {
            action: 'review_meetings',
            threshold: 5
          }
        });
      }

      // Suggestion 3: Add buffers if too many back-to-back
      if (health && health.backToBackMeetings >= 3) {
        suggestions.push({
          type: 'add_buffer',
          priority: 'medium',
          title: 'Add Breaks Between Meetings',
          description: `${health.backToBackMeetings} back-to-back meetings detected. Add 10-15 minute buffers to avoid burnout.`,
          reasoning: 'Short breaks improve focus and prevent meeting fatigue.',
          suggestedAction: {
            action: 'add_buffer',
            bufferMinutes: 15
          }
        });
      }

      // Suggestion 4: Resolve conflicts
      if (conflicts && conflicts.length > 0) {
        const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
        if (criticalConflicts.length > 0) {
          suggestions.push({
            type: 'reschedule',
            priority: 'critical',
            title: 'Resolve Schedule Conflicts',
            description: `${criticalConflicts.length} overlapping meetings detected. Immediate action required.`,
            reasoning: 'You cannot attend two meetings at the same time.',
            suggestedAction: {
              action: 'resolve_conflicts',
              conflicts: criticalConflicts.map(c => c.eventId)
            }
          });
        }
      }

      // Suggestion 5: Best times for meetings (based on patterns)
      if (patterns && patterns.preferredHours && patterns.preferredHours.length > 0) {
        suggestions.push({
          type: 'best_time',
          priority: 'low',
          title: 'Optimal Meeting Times',
          description: `Based on your history, you typically schedule meetings at ${patterns.preferredHours.map(h => `${h}:00`).join(', ')}.`,
          reasoning: 'Scheduling at your preferred times increases meeting acceptance rates.',
          suggestedAction: {
            action: 'use_preferred_hours',
            hours: patterns.preferredHours
          }
        });
      }

      // Save suggestions to database
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 1); // Expire in 24 hours

      for (const suggestion of suggestions) {
        await database.query(`
          INSERT INTO scheduling_suggestions (
            user_id, suggestion_type, priority, title,
            description, reasoning, suggested_action, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          userId,
          suggestion.type,
          suggestion.priority,
          suggestion.title,
          suggestion.description,
          suggestion.reasoning,
          JSON.stringify(suggestion.suggestedAction),
          expiryDate
        ]);
      }

      return suggestions;

    } catch (error) {
      logger.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  /**
   * Save daily health metrics
   */
  async saveHealthMetrics(userId, health) {
    try {
      if (!health) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await database.query(`
        INSERT INTO calendar_health_metrics (
          user_id, metric_date, total_meetings, total_meeting_hours,
          back_to_back_meetings, conflicts_count, overall_health_score,
          balance_score, focus_time_score, efficiency_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, metric_date)
        DO UPDATE SET
          total_meetings = EXCLUDED.total_meetings,
          total_meeting_hours = EXCLUDED.total_meeting_hours,
          back_to_back_meetings = EXCLUDED.back_to_back_meetings,
          conflicts_count = EXCLUDED.conflicts_count,
          overall_health_score = EXCLUDED.overall_health_score,
          balance_score = EXCLUDED.balance_score,
          focus_time_score = EXCLUDED.focus_time_score,
          efficiency_score = EXCLUDED.efficiency_score
      `, [
        userId,
        today,
        health.totalMeetings,
        health.totalHours,
        health.backToBackMeetings,
        health.conflictsCount,
        health.overallHealthScore,
        health.balanceScore,
        health.focusTimeScore,
        health.efficiencyScore
      ]);

    } catch (error) {
      logger.error('Failed to save health metrics:', error);
    }
  }

  /**
   * Get calendar health score for user
   */
  async getCalendarHealth(userId) {
    try {
      return await this.calculateCalendarHealth(userId);
    } catch (error) {
      logger.error('Failed to get calendar health:', error);
      throw error;
    }
  }

  /**
   * Get active scheduling suggestions
   */
  async getActiveSuggestions(userId) {
    try {
      const result = await database.query(`
        SELECT *
        FROM scheduling_suggestions
        WHERE user_id = $1
        AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY 
          CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          created_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        ...row,
        suggested_action: typeof row.suggested_action === 'string' 
          ? JSON.parse(row.suggested_action) 
          : row.suggested_action
      }));

    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  /**
   * Get active conflicts
   */
  async getActiveConflicts(userId) {
    try {
      const result = await database.query(`
        SELECT sc.*, 
          e1.summary as event_summary,
          e2.summary as conflicting_event_summary
        FROM scheduling_conflicts sc
        LEFT JOIN calendar_events e1 ON sc.event_id = e1.id
        LEFT JOIN calendar_events e2 ON sc.conflicting_event_id = e2.id
        WHERE sc.user_id = $1
        AND sc.status = 'active'
        ORDER BY 
          CASE sc.severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          sc.created_at DESC
      `, [userId]);

      return result.rows;

    } catch (error) {
      logger.error('Failed to get conflicts:', error);
      throw error;
    }
  }

  /**
   * Suggest best time for a new meeting
   */
  async suggestBestTime(userId, duration = 60, daysAhead = 7) {
    try {
      // Get user's preferred hours
      const patternsResult = await database.query(`
        SELECT preferred_hours
        FROM user_scheduling_patterns
        WHERE user_id = $1
      `, [userId]);

      const preferredHours = patternsResult.rows[0]?.preferred_hours || [9, 10, 11, 14, 15, 16];

      // Get upcoming events
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const eventsResult = await database.query(`
        SELECT start_time, end_time
        FROM calendar_events
        WHERE user_id = $1
        AND start_time >= NOW()
        AND start_time <= $2
        AND status != 'cancelled'
        ORDER BY start_time
      `, [userId, endDate]);

      const events = eventsResult.rows;

      // Find free slots
      const suggestions = [];
      const now = new Date();

      for (let day = 0; day < daysAhead; day++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + day);
        
        for (const hour of preferredHours) {
          const slotStart = new Date(checkDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          // Skip past times
          if (slotStart < now) continue;

          // Check if slot is free
          const isFree = !events.some(event => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            return (slotStart < eventEnd && slotEnd > eventStart);
          });

          if (isFree) {
            suggestions.push({
              startTime: slotStart,
              endTime: slotEnd,
              confidence: 'high',
              reason: 'Matches your typical meeting times'
            });

            if (suggestions.length >= 5) break;
          }
        }

        if (suggestions.length >= 5) break;
      }

      return suggestions;

    } catch (error) {
      logger.error('Failed to suggest best time:', error);
      throw error;
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(userId, suggestionId) {
    try {
      await database.query(`
        UPDATE scheduling_suggestions
        SET status = 'rejected', acted_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [suggestionId, userId]);

      return { success: true };
    } catch (error) {
      logger.error('Failed to dismiss suggestion:', error);
      throw error;
    }
  }

  /**
   * Accept a suggestion
   */
  async acceptSuggestion(userId, suggestionId) {
    try {
      await database.query(`
        UPDATE scheduling_suggestions
        SET status = 'accepted', acted_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [suggestionId, userId]);

      return { success: true };
    } catch (error) {
      logger.error('Failed to accept suggestion:', error);
      throw error;
    }
  }
}

module.exports = new SmartSchedulingService();

