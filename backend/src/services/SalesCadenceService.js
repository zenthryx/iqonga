/**
 * Sales Cadence Service
 * Manages multi-step sales sequences and automated outreach
 */

const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const SalesEmailService = require('./SalesEmailService');
const ActivityTrackingService = require('./ActivityTrackingService');

class SalesCadenceService {
  /**
   * Create a new sales cadence
   */
  async createCadence(userId, cadenceData) {
    try {
      const cadenceId = uuidv4();
      const {
        cadence_name,
        description,
        channel = 'email',
        is_active = true,
        auto_stop_on_reply = true,
        auto_stop_on_meeting = true,
        default_delay_days = 2
      } = cadenceData;

      const query = `
        INSERT INTO sales_cadences (
          id, user_id, cadence_name, description, channel,
          is_active, auto_stop_on_reply, auto_stop_on_meeting,
          default_delay_days, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await database.query(query, [
        cadenceId,
        userId,
        cadence_name,
        description,
        channel,
        is_active,
        auto_stop_on_reply,
        auto_stop_on_meeting,
        default_delay_days,
        userId
      ]);

      logger.info('Sales cadence created', { cadenceId, userId, cadence_name });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create sales cadence:', error);
      throw error;
    }
  }

  /**
   * Get all cadences for a user
   */
  async getCadences(userId, filters = {}) {
    try {
      let query = `
        SELECT c.*,
          COUNT(DISTINCT e.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_enrollments
        FROM sales_cadences c
        LEFT JOIN sales_cadence_enrollments e ON c.id = e.cadence_id
        WHERE c.user_id = $1
      `;
      const params = [userId];
      let paramCount = 1;

      if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND c.is_active = $${paramCount}`;
        params.push(filters.is_active);
      }

      if (filters.channel) {
        paramCount++;
        query += ` AND c.channel = $${paramCount}`;
        params.push(filters.channel);
      }

      if (filters.search) {
        paramCount++;
        query += ` AND (c.cadence_name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get sales cadences:', error);
      throw error;
    }
  }

  /**
   * Get cadence by ID
   */
  async getCadenceById(cadenceId, userId) {
    try {
      const query = `
        SELECT c.*,
          COUNT(DISTINCT e.id) as total_enrollments,
          COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_enrollments
        FROM sales_cadences c
        LEFT JOIN sales_cadence_enrollments e ON c.id = e.cadence_id
        WHERE c.id = $1 AND c.user_id = $2
        GROUP BY c.id
      `;

      const result = await database.query(query, [cadenceId, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get sales cadence:', error);
      throw error;
    }
  }

  /**
   * Update cadence
   */
  async updateCadence(cadenceId, userId, updates) {
    try {
      const allowedFields = [
        'cadence_name',
        'description',
        'channel',
        'is_active',
        'auto_stop_on_reply',
        'auto_stop_on_meeting',
        'default_delay_days'
      ];

      const setClauses = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          paramCount++;
          setClauses.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(cadenceId, userId);
      const query = `
        UPDATE sales_cadences
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
        RETURNING *
      `;

      const result = await database.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Sales cadence updated', { cadenceId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update sales cadence:', error);
      throw error;
    }
  }

  /**
   * Delete cadence
   */
  async deleteCadence(cadenceId, userId) {
    try {
      const query = `
        DELETE FROM sales_cadences
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [cadenceId, userId]);
      if (result.rows.length === 0) {
        return false;
      }

      logger.info('Sales cadence deleted', { cadenceId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete sales cadence:', error);
      throw error;
    }
  }

  /**
   * Add step to cadence
   */
  async addStep(cadenceId, userId, stepData) {
    try {
      // Verify cadence belongs to user
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      const stepId = uuidv4();
      const {
        step_type,
        step_name,
        step_order,
        delay_days = 0,
        delay_hours = 0,
        email_template_id,
        email_subject,
        email_body,
        track_opens = true,
        track_clicks = true,
        linkedin_message,
        linkedin_action,
        task_subject,
        task_notes,
        task_priority = 'medium',
        wait_reason,
        skip_if_condition = {},
        execute_only_if = {},
        is_ab_test = false,
        ab_variant_name,
        ab_test_percentage = 50
      } = stepData;

      const query = `
        INSERT INTO sales_cadence_steps (
          id, cadence_id, step_order, step_type, step_name,
          delay_days, delay_hours,
          email_template_id, email_subject, email_body, track_opens, track_clicks,
          linkedin_message, linkedin_action,
          task_subject, task_notes, task_priority,
          wait_reason,
          skip_if_condition, execute_only_if,
          is_ab_test, ab_variant_name, ab_test_percentage
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `;

      const result = await database.query(query, [
        stepId,
        cadenceId,
        step_order,
        step_type,
        step_name,
        delay_days,
        delay_hours,
        email_template_id,
        email_subject,
        email_body,
        track_opens,
        track_clicks,
        linkedin_message,
        linkedin_action,
        task_subject,
        task_notes,
        task_priority,
        wait_reason,
        JSON.stringify(skip_if_condition),
        JSON.stringify(execute_only_if),
        is_ab_test,
        ab_variant_name,
        ab_test_percentage
      ]);

      logger.info('Cadence step added', { stepId, cadenceId, step_type });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to add cadence step:', error);
      throw error;
    }
  }

  /**
   * Get steps for a cadence
   */
  async getSteps(cadenceId, userId) {
    try {
      // Verify cadence belongs to user
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      const query = `
        SELECT *
        FROM sales_cadence_steps
        WHERE cadence_id = $1
        ORDER BY step_order ASC
      `;

      const result = await database.query(query, [cadenceId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get cadence steps:', error);
      throw error;
    }
  }

  /**
   * Update step
   */
  async updateStep(stepId, cadenceId, userId, updates) {
    try {
      // Verify cadence belongs to user
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      const allowedFields = [
        'step_order',
        'step_name',
        'delay_days',
        'delay_hours',
        'email_template_id',
        'email_subject',
        'email_body',
        'track_opens',
        'track_clicks',
        'linkedin_message',
        'linkedin_action',
        'task_subject',
        'task_notes',
        'task_priority',
        'wait_reason',
        'skip_if_condition',
        'execute_only_if',
        'is_ab_test',
        'ab_variant_name',
        'ab_test_percentage'
      ];

      const setClauses = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          paramCount++;
          if (key === 'skip_if_condition' || key === 'execute_only_if') {
            setClauses.push(`${key} = $${paramCount}::jsonb`);
            values.push(JSON.stringify(value));
          } else {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(value);
          }
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(stepId, cadenceId);
      const query = `
        UPDATE sales_cadence_steps
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount + 1} AND cadence_id = $${paramCount + 2}
        RETURNING *
      `;

      const result = await database.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Cadence step updated', { stepId, cadenceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update cadence step:', error);
      throw error;
    }
  }

  /**
   * Delete step
   */
  async deleteStep(stepId, cadenceId, userId) {
    try {
      // Verify cadence belongs to user
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      const query = `
        DELETE FROM sales_cadence_steps
        WHERE id = $1 AND cadence_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [stepId, cadenceId]);
      if (result.rows.length === 0) {
        return false;
      }

      // Reorder remaining steps
      await this.reorderSteps(cadenceId);

      logger.info('Cadence step deleted', { stepId, cadenceId });
      return true;
    } catch (error) {
      logger.error('Failed to delete cadence step:', error);
      throw error;
    }
  }

  /**
   * Reorder steps after deletion
   */
  async reorderSteps(cadenceId) {
    try {
      const steps = await database.query(
        'SELECT id FROM sales_cadence_steps WHERE cadence_id = $1 ORDER BY step_order ASC',
        [cadenceId]
      );

      for (let i = 0; i < steps.rows.length; i++) {
        await database.query(
          'UPDATE sales_cadence_steps SET step_order = $1 WHERE id = $2',
          [i + 1, steps.rows[i].id]
        );
      }
    } catch (error) {
      logger.error('Failed to reorder steps:', error);
      throw error;
    }
  }

  /**
   * Enroll lead/deal in cadence
   */
  async enrollLead(cadenceId, userId, leadId, dealId = null) {
    try {
      // Verify cadence belongs to user and is active
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }
      if (!cadence.is_active) {
        throw new Error('Cadence is not active');
      }

      // Check if already enrolled
      const existing = await database.query(
        `SELECT id FROM sales_cadence_enrollments
         WHERE cadence_id = $1 AND lead_id = $2 AND status = 'active'`,
        [cadenceId, leadId]
      );

      if (existing.rows.length > 0) {
        throw new Error('Lead is already enrolled in this cadence');
      }

      // Get first step
      const steps = await this.getSteps(cadenceId, userId);
      if (steps.length === 0) {
        throw new Error('Cadence has no steps');
      }

      const firstStep = steps[0];
      const enrollmentId = uuidv4();

      // Calculate next execution time
      const delayMs = (firstStep.delay_days * 24 * 60 * 60 * 1000) + (firstStep.delay_hours * 60 * 60 * 1000);
      const nextExecutionAt = new Date(Date.now() + delayMs);

      // Assign A/B variant if step is A/B test
      let abVariant = null;
      if (firstStep.is_ab_test) {
        abVariant = Math.random() * 100 < firstStep.ab_test_percentage ? 'variant_a' : 'variant_b';
      }

      // Create enrollment
      const enrollmentQuery = `
        INSERT INTO sales_cadence_enrollments (
          id, cadence_id, user_id, lead_id, deal_id,
          status, current_step_order, next_step_execution_at,
          ab_variant, enrolled_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const enrollmentResult = await database.query(enrollmentQuery, [
        enrollmentId,
        cadenceId,
        userId,
        leadId,
        dealId,
        'active',
        0,
        nextExecutionAt,
        abVariant,
        userId
      ]);

      // Create first execution record
      await this.createExecution(enrollmentId, firstStep, leadId, cadenceId, nextExecutionAt, abVariant);

      logger.info('Lead enrolled in cadence', { enrollmentId, cadenceId, leadId });
      return enrollmentResult.rows[0];
    } catch (error) {
      logger.error('Failed to enroll lead:', error);
      throw error;
    }
  }

  /**
   * Create execution record
   */
  async createExecution(enrollmentId, step, leadId, cadenceId, scheduledFor, abVariant = null) {
    try {
      const executionId = uuidv4();

      // Skip if A/B test and wrong variant
      if (step.is_ab_test && step.ab_variant_name !== abVariant) {
        return null;
      }

      const query = `
        INSERT INTO sales_cadence_executions (
          id, enrollment_id, step_id, cadence_id, lead_id,
          step_order, step_type, execution_status, scheduled_for
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await database.query(query, [
        executionId,
        enrollmentId,
        step.id,
        cadenceId,
        leadId,
        step.step_order,
        step.step_type,
        'pending',
        scheduledFor
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create execution:', error);
      throw error;
    }
  }

  /**
   * Get enrollments for a cadence
   */
  async getEnrollments(cadenceId, userId, filters = {}) {
    try {
      // Verify cadence belongs to user
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      let query = `
        SELECT e.*,
          l.first_name, l.last_name, l.email, l.company_name,
          d.deal_name, d.amount, d.currency
        FROM sales_cadence_enrollments e
        LEFT JOIN leads l ON e.lead_id = l.id
        LEFT JOIN deals d ON e.deal_id = d.id
        WHERE e.cadence_id = $1
      `;
      const params = [cadenceId];
      let paramCount = 1;

      if (filters.status) {
        paramCount++;
        query += ` AND e.status = $${paramCount}`;
        params.push(filters.status);
      }

      query += ` ORDER BY e.enrolled_at DESC`;

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get enrollments:', error);
      throw error;
    }
  }

  /**
   * Pause enrollment
   */
  async pauseEnrollment(enrollmentId, userId) {
    try {
      const query = `
        UPDATE sales_cadence_enrollments
        SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await database.query(query, [enrollmentId, userId]);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Enrollment paused', { enrollmentId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to pause enrollment:', error);
      throw error;
    }
  }

  /**
   * Resume enrollment
   */
  async resumeEnrollment(enrollmentId, userId) {
    try {
      // Get enrollment and calculate next execution
      const enrollment = await database.query(
        'SELECT * FROM sales_cadence_enrollments WHERE id = $1 AND user_id = $2',
        [enrollmentId, userId]
      );

      if (enrollment.rows.length === 0) {
        return null;
      }

      const enroll = enrollment.rows[0];
      const steps = await this.getSteps(enroll.cadence_id, userId);
      const currentStep = steps.find(s => s.step_order === enroll.current_step_order);

      if (!currentStep) {
        throw new Error('Current step not found');
      }

      const delayMs = (currentStep.delay_days * 24 * 60 * 60 * 1000) + (currentStep.delay_hours * 60 * 60 * 1000);
      const nextExecutionAt = new Date(Date.now() + delayMs);

      const query = `
        UPDATE sales_cadence_enrollments
        SET status = 'active', next_step_execution_at = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await database.query(query, [nextExecutionAt, enrollmentId, userId]);
      logger.info('Enrollment resumed', { enrollmentId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to resume enrollment:', error);
      throw error;
    }
  }

  /**
   * Stop enrollment
   */
  async stopEnrollment(enrollmentId, userId, reason = 'Manual stop') {
    try {
      const query = `
        UPDATE sales_cadence_enrollments
        SET status = 'stopped', stopped_reason = $1, stopped_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await database.query(query, [reason, enrollmentId, userId]);
      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Enrollment stopped', { enrollmentId, reason });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to stop enrollment:', error);
      throw error;
    }
  }

  /**
   * Execute pending cadence steps (called by scheduler)
   */
  async executePendingSteps() {
    try {
      // Get all pending executions that are due
      const query = `
        SELECT ex.*, e.lead_id, e.deal_id, e.user_id, e.cadence_id,
          s.*, c.auto_stop_on_reply, c.auto_stop_on_meeting
        FROM sales_cadence_executions ex
        JOIN sales_cadence_enrollments e ON ex.enrollment_id = e.id
        JOIN sales_cadence_steps s ON ex.step_id = s.id
        JOIN sales_cadences c ON ex.cadence_id = c.id
        WHERE ex.execution_status = 'pending'
          AND ex.scheduled_for <= NOW()
          AND e.status = 'active'
          AND c.is_active = true
        ORDER BY ex.scheduled_for ASC
        LIMIT 100
      `;

      const result = await database.query(query);
      const executions = result.rows;

      for (const execution of executions) {
        try {
          await this.executeStep(execution);
        } catch (error) {
          logger.error('Failed to execute step:', { executionId: execution.id, error: error.message });
          // Mark as failed
          await database.query(
            `UPDATE sales_cadence_executions
             SET execution_status = 'failed', error_message = $1, updated_at = NOW()
             WHERE id = $2`,
            [error.message, execution.id]
          );
        }
      }

      return { executed: executions.length };
    } catch (error) {
      logger.error('Failed to execute pending steps:', error);
      throw error;
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(execution) {
    try {
      const { step_type, lead_id, user_id, cadence_id, enrollment_id, step_id } = execution;

      // Check stop conditions
      const cadence = await this.getCadenceById(cadence_id, user_id);
      if (cadence.auto_stop_on_reply) {
        // Check if lead replied to any email
        const replied = await database.query(
          `SELECT COUNT(*) FROM activities
           WHERE lead_id = $1 AND activity_type = 'email_received' AND created_at > (
             SELECT enrolled_at FROM sales_cadence_enrollments WHERE id = $2
           )`,
          [lead_id, enrollment_id]
        );
        if (parseInt(replied.rows[0].count) > 0) {
          await this.stopEnrollment(enrollment_id, user_id, 'Lead replied to email');
          return;
        }
      }

      if (cadence.auto_stop_on_meeting) {
        // Check if meeting scheduled
        const meeting = await database.query(
          `SELECT COUNT(*) FROM activities
           WHERE lead_id = $1 AND activity_type = 'meeting' AND is_completed = false
           AND created_at > (SELECT enrolled_at FROM sales_cadence_enrollments WHERE id = $2)`,
          [lead_id, enrollment_id]
        );
        if (parseInt(meeting.rows[0].count) > 0) {
          await this.stopEnrollment(enrollment_id, user_id, 'Meeting scheduled');
          return;
        }
      }

      let executionResult = {};

      // Execute based on step type
      switch (step_type) {
        case 'email':
          executionResult = await this.executeEmailStep(execution);
          break;
        case 'call_task':
          executionResult = await this.executeTaskStep(execution);
          break;
        case 'wait':
          // Wait steps are handled by delay_days, just mark as executed
          executionResult = { type: 'wait', executed: true };
          break;
        case 'linkedin_message':
          // LinkedIn steps deferred (not implemented yet)
          executionResult = { type: 'linkedin', message: 'LinkedIn integration not yet implemented' };
          break;
        default:
          throw new Error(`Unknown step type: ${step_type}`);
      }

      // Mark execution as executed
      await database.query(
        `UPDATE sales_cadence_executions
         SET execution_status = 'executed', executed_at = NOW(),
             execution_result = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(executionResult), execution.id]
      );

      // Update enrollment to next step
      await this.advanceEnrollment(enrollment_id, execution);

      logger.info('Step executed', { executionId: execution.id, stepType: step_type });
    } catch (error) {
      logger.error('Failed to execute step:', error);
      throw error;
    }
  }

  /**
   * Execute email step
   */
  async executeEmailStep(execution) {
    try {
      const { lead_id, user_id, email_template_id, email_subject, email_body, track_opens, track_clicks } = execution;

      // Get lead data
      const lead = await database.query('SELECT * FROM leads WHERE id = $1', [lead_id]);
      if (lead.rows.length === 0) {
        throw new Error('Lead not found');
      }
      const leadData = lead.rows[0];

      // Get template if provided
      let subject = email_subject;
      let body = email_body;

      if (email_template_id) {
        const EmailTemplateService = require('./EmailTemplateService');
        const template = await EmailTemplateService.getTemplateById(email_template_id, user_id);
        if (template) {
          subject = template.subject || subject;
          body = template.body || body;
        }
      }

      // Personalize email
      subject = this.personalizeContent(subject, leadData);
      body = this.personalizeContent(body, leadData);

      // Send email
      const emailData = {
        leadId: lead_id,
        to: leadData.email,
        subject: subject,
        body: body,
        trackOpens: track_opens,
        trackClicks: track_clicks
      };

      const emailResult = await SalesEmailService.sendSalesEmail(user_id, emailData);

      return {
        type: 'email',
        emailSentId: emailResult.email_id,
        executed: true
      };
    } catch (error) {
      logger.error('Failed to execute email step:', error);
      throw error;
    }
  }

  /**
   * Execute task step
   */
  async executeTaskStep(execution) {
    try {
      const { lead_id, user_id, task_subject, task_notes, task_priority } = execution;

      // Create task activity
      const activityData = {
        lead_id: lead_id,
        type: 'task',
        subject: task_subject,
        notes: task_notes,
        priority: task_priority,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due in 1 day
      };

      const activity = await ActivityTrackingService.logActivity(user_id, activityData);

      return {
        type: 'task',
        taskCreatedId: activity.id,
        executed: true
      };
    } catch (error) {
      logger.error('Failed to execute task step:', error);
      throw error;
    }
  }

  /**
   * Advance enrollment to next step
   */
  async advanceEnrollment(enrollmentId, currentExecution) {
    try {
      const enrollment = await database.query(
        'SELECT * FROM sales_cadence_enrollments WHERE id = $1',
        [enrollmentId]
      );

      if (enrollment.rows.length === 0) {
        return;
      }

      const enroll = enrollment.rows[0];
      const steps = await this.getSteps(enroll.cadence_id, enroll.user_id);

      const nextStepOrder = enroll.current_step_order + 1;
      const nextStep = steps.find(s => s.step_order === nextStepOrder);

      if (!nextStep) {
        // No more steps, mark as completed
        await database.query(
          `UPDATE sales_cadence_enrollments
           SET status = 'completed', completed_at = NOW(),
               total_steps_completed = $1, updated_at = NOW()
           WHERE id = $2`,
          [enroll.total_steps_completed + 1, enrollmentId]
        );
        return;
      }

      // Calculate next execution time
      const delayMs = (nextStep.delay_days * 24 * 60 * 60 * 1000) + (nextStep.delay_hours * 60 * 60 * 1000);
      const nextExecutionAt = new Date(Date.now() + delayMs);

      // Update enrollment
      await database.query(
        `UPDATE sales_cadence_enrollments
         SET current_step_order = $1, next_step_execution_at = $2,
             total_steps_completed = $3, updated_at = NOW()
         WHERE id = $4`,
        [nextStepOrder, nextExecutionAt, enroll.total_steps_completed + 1, enrollmentId]
      );

      // Create next execution
      await this.createExecution(enrollmentId, nextStep, enroll.lead_id, enroll.cadence_id, nextExecutionAt, enroll.ab_variant);
    } catch (error) {
      logger.error('Failed to advance enrollment:', error);
      throw error;
    }
  }

  /**
   * Personalize content with lead data
   */
  personalizeContent(content, leadData) {
    if (!content) return '';

    return content
      .replace(/\{\{first_name\}\}/g, leadData.first_name || '')
      .replace(/\{\{last_name\}\}/g, leadData.last_name || '')
      .replace(/\{\{full_name\}\}/g, `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim())
      .replace(/\{\{company_name\}\}/g, leadData.company_name || '')
      .replace(/\{\{job_title\}\}/g, leadData.job_title || '')
      .replace(/\{\{email\}\}/g, leadData.email || '')
      .replace(/\{\{phone\}\}/g, leadData.phone || '')
      .replace(/\{\{source\}\}/g, leadData.source || '');
  }

  /**
   * Get cadence statistics
   */
  async getCadenceStats(cadenceId, userId) {
    try {
      const cadence = await this.getCadenceById(cadenceId, userId);
      if (!cadence) {
        throw new Error('Cadence not found');
      }

      const stats = await database.query(
        `SELECT
          COUNT(*) as total_enrollments,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
          COUNT(CASE WHEN status = 'stopped' THEN 1 END) as stopped_enrollments,
          AVG(total_steps_completed) as avg_steps_completed
        FROM sales_cadence_enrollments
        WHERE cadence_id = $1`,
        [cadenceId]
      );

      const executionStats = await database.query(
        `SELECT
          COUNT(*) as total_executions,
          COUNT(CASE WHEN execution_status = 'executed' THEN 1 END) as executed_count,
          COUNT(CASE WHEN execution_status = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN email_opened = true THEN 1 END) as emails_opened,
          COUNT(CASE WHEN email_clicked = true THEN 1 END) as emails_clicked,
          COUNT(CASE WHEN email_replied = true THEN 1 END) as emails_replied
        FROM sales_cadence_executions
        WHERE cadence_id = $1`,
        [cadenceId]
      );

      return {
        enrollments: stats.rows[0],
        executions: executionStats.rows[0]
      };
    } catch (error) {
      logger.error('Failed to get cadence stats:', error);
      throw error;
    }
  }
}

module.exports = new SalesCadenceService();

