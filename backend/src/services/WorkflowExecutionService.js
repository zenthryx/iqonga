/**
 * WorkflowExecutionService – Run workflows: execute tasks in order (or graph), handle approval pause/resume, sub-workflows.
 */

const database = require('../database/connection');
const logger = require('../utils/logger');
const WorkflowService = require('./WorkflowService');
const AssistantOrchestrationService = require('./AssistantOrchestrationService');

class WorkflowExecutionService {
  /**
   * Start and run a workflow. Creates execution and steps on the fly. Pauses on approval steps.
   */
  async runWorkflow(workflowId, userId, inputPrompt = '', parentExecutionId = null, parentStepId = null) {
    const workflow = await WorkflowService.getById(workflowId, userId);
    if (!workflow) throw new Error('Workflow not found');

    const tasks = await WorkflowService.listTasks(workflowId, userId);
    if (!tasks || tasks.length === 0) throw new Error('Workflow has no tasks');

    const execResult = await database.query(
      `INSERT INTO workflow_executions (workflow_id, user_id, input_prompt, status, started_at, parent_execution_id, parent_step_id)
       VALUES ($1, $2, $3, 'running', NOW(), $4, $5) RETURNING *`,
      [workflowId, userId, inputPrompt || null, parentExecutionId, parentStepId]
    );
    const execution = execResult.rows[0];

    return this.runFromStepIndex(execution, tasks, 0, inputPrompt || 'Please begin this workflow.', userId);
  }

  /**
   * Run workflow from a given step index. Used for fresh runs and resume after approval.
   */
  async runFromStepIndex(execution, tasks, startIndex, aggregatedOutput, userId) {
    let currentOutput = aggregatedOutput;
    let failed = false;
    let errorMessage = null;

    for (let i = startIndex; i < tasks.length; i++) {
      const task = tasks[i];
      const inputForStep = i === 0
        ? (execution.input_prompt || 'Please begin this workflow.')
        : (task.handoff_instructions || 'Continue from the previous step.') + '\n\nPrevious step output:\n' + currentOutput;

      const stepResult = await database.query(
        `INSERT INTO workflow_execution_steps (execution_id, workflow_task_id, sort_order, agent_id, input_text, status, started_at)
         VALUES ($1, $2, $3, $4, $5, 'running', NOW()) RETURNING *`,
        [execution.id, task.id, i, task.agent_id, i === 0 ? execution.input_prompt : inputForStep]
      );
      const stepRow = stepResult.rows[0];

      const taskType = (task.task_type || 'agent').toLowerCase();

      if (taskType === 'approval') {
        await database.query(
          `UPDATE workflow_execution_steps SET status = 'pending_approval', input_text = $1 WHERE id = $2`,
          [inputForStep, stepRow.id]
        );
        return this.getExecution(execution.id, userId);
      }

      if (taskType === 'agent') {
        if (!task.agent_id) {
          await this.failStep(stepRow.id, 'Agent step requires an agent');
          failed = true;
          errorMessage = `Step ${i + 1}: No agent assigned`;
          break;
        }
        try {
          const agentResult = await database.query(
            'SELECT * FROM ai_agents WHERE id = $1 AND user_id = $2',
            [task.agent_id, userId]
          );
          const agent = agentResult.rows[0];
          if (!agent) {
            await this.failStep(stepRow.id, 'Agent not found');
            failed = true;
            errorMessage = `Step ${i + 1}: Agent not found`;
            break;
          }

          const replyText = await AssistantOrchestrationService.runOneTurnHeadless(
            agent,
            userId,
            inputForStep,
            { previousContext: i > 0 ? currentOutput : '' }
          );

          currentOutput += (currentOutput ? '\n\n---\n\n' : '') + `**${task.name} (${task.agent_name || 'Agent'}):**\n${replyText}`;

          await database.query(
            `UPDATE workflow_execution_steps SET output_text = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
            [replyText, stepRow.id]
          );
        } catch (err) {
          logger.error('WorkflowExecutionService step failed:', err);
          await this.failStep(stepRow.id, err.message);
          failed = true;
          errorMessage = `Step ${i + 1}: ${err.message}`;
          break;
        }
      } else if (taskType === 'router') {
        const nextTaskId = this.evaluateRouter(task, currentOutput, tasks);
        const outputText = nextTaskId ? `[Router: next step ${nextTaskId}]` : '[Router: no match, continuing]';
        currentOutput += (currentOutput ? '\n\n---\n\n' : '') + `**${task.name}:**\n${outputText}`;
        await database.query(
          `UPDATE workflow_execution_steps SET output_text = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
          [outputText, stepRow.id]
        );
        if (nextTaskId) {
          const nextIdx = tasks.findIndex((t) => t.id === nextTaskId);
          if (nextIdx >= 0 && nextIdx !== i + 1) {
            return this.runFromStepIndex(execution, tasks, nextIdx, currentOutput, userId);
          }
        }
      } else if (taskType === 'sub_workflow' && task.sub_workflow_id) {
        try {
          const childWorkflow = await WorkflowService.getById(task.sub_workflow_id, userId);
          if (!childWorkflow) {
            await this.failStep(stepRow.id, 'Sub-workflow not found');
            failed = true;
            errorMessage = `Step ${i + 1}: Sub-workflow not found`;
            break;
          }
          const childExec = await this.runWorkflow(task.sub_workflow_id, userId, inputForStep, execution.id, stepRow.id);
          const childOutput = childExec.aggregated_output || '';
          const childStatus = childExec.status;
          if (childStatus === 'failed') {
            await this.failStep(stepRow.id, childExec.error_message || 'Sub-workflow failed');
            failed = true;
            errorMessage = `Step ${i + 1}: Sub-workflow failed`;
            break;
          }
          if (childStatus === 'running') {
            await database.query(
              `UPDATE workflow_execution_steps SET status = 'pending_approval', output_text = $1 WHERE id = $2`,
              ['[Waiting for sub-workflow to complete – resume the child execution]', stepRow.id]
            );
            return this.getExecution(execution.id, userId);
          }
          currentOutput += (currentOutput ? '\n\n---\n\n' : '') + `**${task.name} (${task.sub_workflow_name || 'Sub-workflow'}):**\n${childOutput}`;
          await database.query(
            `UPDATE workflow_execution_steps SET output_text = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
            [childOutput, stepRow.id]
          );
        } catch (err) {
          logger.error('WorkflowExecutionService sub-workflow failed:', err);
          await this.failStep(stepRow.id, err.message);
          failed = true;
          errorMessage = `Step ${i + 1}: ${err.message}`;
          break;
        }
      } else {
        await this.failStep(stepRow.id, `Unknown task type: ${taskType}`);
        failed = true;
        errorMessage = `Step ${i + 1}: Unknown task type`;
        break;
      }
    }

    await database.query(
      `UPDATE workflow_executions SET status = $1, aggregated_output = $2, error_message = $3, completed_at = NOW() WHERE id = $4`,
      [failed ? 'failed' : 'completed', currentOutput, errorMessage, execution.id]
    );

    if (!failed && execution.parent_execution_id && execution.parent_step_id) {
      await this.continueParentAfterChild(execution, currentOutput, userId);
    }

    return this.getExecution(execution.id, userId);
  }

  async continueParentAfterChild(childExecution, childOutput, userId) {
    const parent = await database.query(
      'SELECT * FROM workflow_executions WHERE id = $1 AND user_id = $2',
      [childExecution.parent_execution_id, userId]
    ).then(r => r.rows[0]);
    if (!parent || parent.status !== 'running') return;

    await database.query(
      `UPDATE workflow_execution_steps SET output_text = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
      [childOutput, childExecution.parent_step_id]
    );

    const tasks = await WorkflowService.listTasks(parent.workflow_id, userId);
    const completedSteps = await database.query(
      `SELECT * FROM workflow_execution_steps WHERE execution_id = $1 AND status = 'completed' ORDER BY sort_order`,
      [parent.id]
    );
    let aggregatedOutput = '';
    for (const s of completedSteps.rows) {
      if (s.output_text) aggregatedOutput += (aggregatedOutput ? '\n\n---\n\n' : '') + s.output_text;
    }
    const nextIndex = completedSteps.rows.length;
    await this.runFromStepIndex(parent, tasks, nextIndex, aggregatedOutput, userId);
  }

  evaluateRouter(task, lastOutput, tasks) {
    const config = task.branch_config;
    if (!config || !Array.isArray(config)) {
      if (task.next_step_id) return task.next_step_id;
      return null;
    }
    const output = (lastOutput || '').toLowerCase();
    for (const branch of config) {
      if (branch.condition === 'default' && branch.next_task_id) return branch.next_task_id;
      if (branch.condition === 'output_contains' && branch.value && output.includes((branch.value || '').toLowerCase())) {
        return branch.next_task_id;
      }
    }
    for (const branch of config) {
      if (branch.condition === 'default' && branch.next_task_id) return branch.next_task_id;
    }
    return task.next_step_id || null;
  }

  async resumeExecution(executionId, userId, { resolution }) {
    const exec = await database.query(
      'SELECT * FROM workflow_executions WHERE id = $1 AND user_id = $2',
      [executionId, userId]
    ).then(r => r.rows[0]);
    if (!exec) throw new Error('Execution not found');
    if (exec.status !== 'running') throw new Error('Execution is not running');

    const steps = await database.query(
      `SELECT * FROM workflow_execution_steps WHERE execution_id = $1 AND status = 'pending_approval' ORDER BY sort_order`,
      [executionId]
    );
    const pendingStep = steps.rows[0];
    if (!pendingStep) throw new Error('No step pending approval');

    const resolved = (resolution || '').toLowerCase() === 'approved' ? 'approved' : 'rejected';
    await database.query(
      `UPDATE workflow_execution_steps SET status = 'completed', resolution = $1, approved_by = $2, approved_at = NOW(), output_text = COALESCE(output_text, $3), completed_at = NOW() WHERE id = $4`,
      [resolved, userId, `[${resolved}]`, pendingStep.id]
    );

    if (resolved === 'rejected') {
      await database.query(
        `UPDATE workflow_executions SET status = 'failed', error_message = 'Rejected by user', completed_at = NOW() WHERE id = $1`,
        [executionId]
      );
      return this.getExecution(executionId, userId);
    }

    const workflow = await WorkflowService.getById(exec.workflow_id, userId);
    const tasks = await WorkflowService.listTasks(exec.workflow_id, userId);
    const completedSteps = await database.query(
      `SELECT * FROM workflow_execution_steps WHERE execution_id = $1 AND status = 'completed' ORDER BY sort_order`,
      [executionId]
    );
    let aggregatedOutput = '';
    for (const s of completedSteps.rows) {
      if (s.output_text) aggregatedOutput += (aggregatedOutput ? '\n\n---\n\n' : '') + s.output_text;
    }
    const nextIndex = completedSteps.rows.length;
    return this.runFromStepIndex(exec, tasks, nextIndex, aggregatedOutput, userId);
  }

  async failStep(stepId, errorMessage) {
    await database.query(
      `UPDATE workflow_execution_steps SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [errorMessage, stepId]
    );
  }

  async getExecution(executionId, userId) {
    const r = await database.query(
      `SELECT e.*, w.name AS workflow_name FROM workflow_executions e
       JOIN workflows w ON w.id = e.workflow_id WHERE e.id = $1 AND e.user_id = $2`,
      [executionId, userId]
    );
    const exec = r.rows[0];
    if (!exec) return null;
    const steps = await database.query(
      `SELECT s.*, a.name AS agent_name, wt.name AS task_name, wt.task_type
       FROM workflow_execution_steps s
       JOIN workflow_tasks wt ON wt.id = s.workflow_task_id
       LEFT JOIN ai_agents a ON a.id = s.agent_id
       WHERE s.execution_id = $1 ORDER BY s.sort_order`,
      [executionId]
    );
    exec.steps = steps.rows;
    if (exec.started_at && exec.completed_at) {
      exec.duration_ms = new Date(exec.completed_at) - new Date(exec.started_at);
    } else if (exec.started_at) {
      exec.duration_ms = Date.now() - new Date(exec.started_at);
    }
    return exec;
  }

  async listExecutions(workflowId, userId, limit = 20) {
    const r = await database.query(
      `SELECT id, workflow_id, user_id, input_prompt, status, aggregated_output, error_message, started_at, completed_at, created_at
       FROM workflow_executions WHERE workflow_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [workflowId, userId, limit]
    );
    return r.rows;
  }

  async listExecutionsAll(userId, limit = 50) {
    const r = await database.query(
      `SELECT e.id, e.workflow_id, e.user_id, e.input_prompt, e.status, e.started_at, e.completed_at, e.created_at, w.name AS workflow_name
       FROM workflow_executions e
       JOIN workflows w ON w.id = e.workflow_id
       WHERE e.user_id = $1 ORDER BY e.created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return r.rows;
  }
}

module.exports = new WorkflowExecutionService();
