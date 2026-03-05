/**
 * Workflows API: CRUD workflows, tasks, run workflow, templates, triggers, resume.
 */

const express = require('express');
const router = express.Router();
const database = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const WorkflowService = require('../services/WorkflowService');
const WorkflowExecutionService = require('../services/WorkflowExecutionService');

function getUserId(req) {
  return req.user?.id || req.user?.wallet_address;
}

// Webhook trigger – no auth; uses token or Bearer matching webhook_secret
router.post('/:id/trigger', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const token = req.headers['x-webhook-token'] || req.query.token || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
    const r = await database.query(
      'SELECT id, user_id, trigger_type, webhook_secret FROM workflows WHERE id = $1',
      [workflowId]
    );
    const w = r.rows[0];
    if (!w) return res.status(404).json({ success: false, error: 'Workflow not found' });
    if (w.trigger_type !== 'webhook') return res.status(400).json({ success: false, error: 'Workflow is not configured for webhook trigger' });
    if (w.webhook_secret && w.webhook_secret !== token) return res.status(401).json({ success: false, error: 'Invalid webhook token' });
    const inputPrompt = (req.body && req.body.input_prompt) || (req.body && typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
    const execution = await WorkflowExecutionService.runWorkflow(workflowId, w.user_id, inputPrompt);
    res.json({ success: true, data: execution });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.use(authenticateToken);

// GET /api/workflows – list user's workflows
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const list = await WorkflowService.listByUser(userId);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/executions – list all executions (optional ?workflowId=)
router.get('/executions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const workflowId = req.query.workflowId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const list = workflowId
      ? await WorkflowExecutionService.listExecutions(workflowId, userId, limit)
      : await WorkflowExecutionService.listExecutionsAll(userId, limit);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/workflows/executions/:id/resume – resume after approval
router.post('/executions/:id/resume', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { resolution } = req.body || {};
    const execution = await WorkflowExecutionService.resumeExecution(req.params.id, userId, { resolution });
    res.json({ success: true, data: execution });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/executions/:executionId – must be before /:id
router.get('/executions/:executionId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const execution = await WorkflowExecutionService.getExecution(req.params.executionId, userId);
    if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
    res.json({ success: true, data: execution });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/templates – list templates (must be before /:id)
router.get('/templates', async (req, res) => {
  try {
    const list = await WorkflowService.listTemplates();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/:id – get one workflow with tasks
router.get('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const workflow = await WorkflowService.getById(req.params.id, userId);
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
    const tasks = await WorkflowService.listTasks(req.params.id, userId);
    res.json({ success: true, data: { ...workflow, tasks: tasks || [] } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/workflows/from-template – create workflow from template
router.post('/from-template', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { template_id } = req.body || {};
    if (!template_id) return res.status(400).json({ success: false, error: 'template_id required' });
    const workflow = await WorkflowService.createFromTemplate(template_id, userId);
    if (!workflow) return res.status(404).json({ success: false, error: 'Template not found' });
    res.status(201).json({ success: true, data: workflow });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/workflows – create workflow
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, description, trigger_type, schedule_cron, webhook_secret } = req.body || {};
    const row = await WorkflowService.create(userId, { name, description, trigger_type, schedule_cron, webhook_secret });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/workflows/:id – update workflow
router.put('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const existing = await WorkflowService.getById(req.params.id, userId);
    if (!existing) return res.status(404).json({ success: false, error: 'Workflow not found' });
    const { name, description, trigger_type, schedule_cron, webhook_secret, is_template } = req.body || {};
    const payload = {
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : existing.description,
      trigger_type: trigger_type !== undefined ? trigger_type : existing.trigger_type,
      schedule_cron: schedule_cron !== undefined ? schedule_cron : existing.schedule_cron,
      webhook_secret: webhook_secret !== undefined ? webhook_secret : existing.webhook_secret,
      is_template: is_template !== undefined ? is_template : existing.is_template,
    };
    const row = await WorkflowService.update(req.params.id, userId, payload);
    if (!row) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ok = await WorkflowService.delete(req.params.id, userId);
    if (!ok) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/:id/tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tasks = await WorkflowService.listTasks(req.params.id, userId);
    if (tasks === null) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.json({ success: true, data: tasks });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/workflows/:id/tasks
router.post('/:id/tasks', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id } = req.body || {};
    const row = await WorkflowService.addTask(req.params.id, userId, { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id });
    if (!row) return res.status(404).json({ success: false, error: 'Workflow not found' });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    const status = e.message && e.message.includes('Circular') ? 400 : 500;
    res.status(status).json({ success: false, error: e.message });
  }
});

// PUT /api/workflows/tasks/:taskId
router.put('/tasks/:taskId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id } = req.body || {};
    const row = await WorkflowService.updateTask(req.params.taskId, userId, { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id });
    if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    const status = e.message && e.message.includes('Circular') ? 400 : 500;
    res.status(status).json({ success: false, error: e.message });
  }
});

// DELETE /api/workflows/tasks/:taskId
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const ok = await WorkflowService.deleteTask(req.params.taskId, userId);
    if (!ok) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/workflows/:id/run
router.post('/:id/run', async (req, res) => {
  try {
    const userId = getUserId(req);
    const inputPrompt = (req.body && req.body.input_prompt) || '';
    const execution = await WorkflowExecutionService.runWorkflow(req.params.id, userId, inputPrompt);
    res.json({ success: true, data: execution });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// GET /api/workflows/:id/executions
router.get('/:id/executions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const list = await WorkflowExecutionService.listExecutions(req.params.id, userId, limit);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
