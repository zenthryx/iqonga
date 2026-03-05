/**
 * WorkflowService – CRUD for workflows and workflow_tasks; templates and triggers.
 */

const database = require('../database/connection');
const logger = require('../utils/logger');

class WorkflowService {
  async listByUser(userId) {
    const r = await database.query(
      `SELECT id, user_id, name, description, is_template, trigger_type, schedule_cron, created_at, updated_at
       FROM workflows WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return r.rows;
  }

  async getById(workflowId, userId) {
    const r = await database.query(
      'SELECT * FROM workflows WHERE id = $1 AND user_id = $2',
      [workflowId, userId]
    );
    return r.rows[0] || null;
  }

  async create(userId, { name, description, trigger_type, schedule_cron, webhook_secret }) {
    const r = await database.query(
      `INSERT INTO workflows (user_id, name, description, trigger_type, schedule_cron, webhook_secret)
       VALUES ($1, $2, $3, COALESCE($4, 'manual'), $5, $6)
       RETURNING *`,
      [userId, name || 'Untitled workflow', description || null, trigger_type, schedule_cron || null, webhook_secret || null]
    );
    return r.rows[0];
  }

  async update(workflowId, userId, { name, description, trigger_type, schedule_cron, webhook_secret, is_template }) {
    const r = await database.query(
      `UPDATE workflows SET
         name = COALESCE($1, name), description = COALESCE($2, description),
         trigger_type = COALESCE($3, trigger_type), schedule_cron = $4, webhook_secret = $5,
         is_template = COALESCE($6, is_template), updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name, description, trigger_type, schedule_cron !== undefined ? schedule_cron : null, webhook_secret !== undefined ? webhook_secret : null, is_template !== undefined ? is_template : null, workflowId, userId]
    );
    return r.rows[0] || null;
  }

  async delete(workflowId, userId) {
    const r = await database.query(
      'DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING id',
      [workflowId, userId]
    );
    return r.rowCount > 0;
  }

  async listTasks(workflowId, userId) {
    const w = await this.getById(workflowId, userId);
    if (!w) return null;
    const r = await database.query(
      `SELECT wt.*, a.name AS agent_name, sw.name AS sub_workflow_name
       FROM workflow_tasks wt
       LEFT JOIN ai_agents a ON a.id = wt.agent_id
       LEFT JOIN workflows sw ON sw.id = wt.sub_workflow_id
       WHERE wt.workflow_id = $1 ORDER BY wt.sort_order, wt.created_at`,
      [workflowId]
    );
    return r.rows;
  }

  async listTasksByWorkflowId(workflowId) {
    const r = await database.query(
      `SELECT wt.*, a.name AS agent_name, sw.name AS sub_workflow_name
       FROM workflow_tasks wt
       LEFT JOIN ai_agents a ON a.id = wt.agent_id
       LEFT JOIN workflows sw ON sw.id = wt.sub_workflow_id
       WHERE wt.workflow_id = $1 ORDER BY wt.sort_order, wt.created_at`,
      [workflowId]
    );
    return r.rows;
  }

  /** Return all workflow IDs referenced by the given workflow via sub_workflow_id (transitive). Used for cycle detection. */
  async getReachableWorkflowIds(fromWorkflowId, visited = new Set()) {
    const tasks = await this.listTasksByWorkflowId(fromWorkflowId);
    for (const t of tasks) {
      if (t.sub_workflow_id && !visited.has(t.sub_workflow_id)) {
        visited.add(t.sub_workflow_id);
        await this.getReachableWorkflowIds(t.sub_workflow_id, visited);
      }
    }
    return visited;
  }

  async addTask(workflowId, userId, { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id }) {
    const w = await this.getById(workflowId, userId);
    if (!w) return null;
    if (sub_workflow_id) {
      const reachable = await this.getReachableWorkflowIds(sub_workflow_id);
      if (reachable.has(workflowId)) throw new Error('Circular sub-workflow: that workflow eventually calls this one');
    }
    const tasks = await this.listTasks(workflowId, userId);
    const order = sort_order != null ? sort_order : (tasks || []).length;
    const r = await database.query(
      `INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'agent'), $7, $8, $9) RETURNING *`,
      [workflowId, order, name || 'Task', agent_id || null, handoff_instructions || null, task_type, next_step_id || null, branch_config ? JSON.stringify(branch_config) : null, sub_workflow_id || null]
    );
    return r.rows[0];
  }

  async updateTask(taskId, userId, { name, agent_id, sort_order, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id }) {
    const task = await database.query(
      'SELECT wt.* FROM workflow_tasks wt JOIN workflows w ON w.id = wt.workflow_id WHERE wt.id = $1 AND w.user_id = $2',
      [taskId, userId]
    ).then(r => r.rows[0]);
    if (!task) return null;
    const targetSubId = sub_workflow_id !== undefined ? sub_workflow_id : task.sub_workflow_id;
    if (targetSubId) {
      const reachable = await this.getReachableWorkflowIds(targetSubId);
      if (reachable.has(task.workflow_id)) throw new Error('Circular sub-workflow: that workflow eventually calls this one');
    }
    const r = await database.query(
      `UPDATE workflow_tasks SET
         name = COALESCE($1, name), agent_id = $2,
         sort_order = COALESCE($3, sort_order), handoff_instructions = COALESCE($4, handoff_instructions),
         task_type = COALESCE($5, task_type), next_step_id = $6, branch_config = $7, sub_workflow_id = $8,
         updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, agent_id !== undefined ? agent_id : task.agent_id, sort_order, handoff_instructions, task_type, next_step_id !== undefined ? next_step_id : task.next_step_id, branch_config !== undefined ? (branch_config ? JSON.stringify(branch_config) : null) : task.branch_config, sub_workflow_id !== undefined ? sub_workflow_id : task.sub_workflow_id, taskId]
    );
    return r.rows[0] || null;
  }

  async deleteTask(taskId, userId) {
    const task = await database.query(
      'SELECT wt.id FROM workflow_tasks wt JOIN workflows w ON w.id = wt.workflow_id WHERE wt.id = $1 AND w.user_id = $2',
      [taskId, userId]
    ).then(r => r.rows[0]);
    if (!task) return false;
    await database.query('DELETE FROM workflow_tasks WHERE id = $1', [taskId]);
    return true;
  }

  async listTemplates() {
    const r = await database.query(
      `SELECT id, name, description, created_at FROM workflows WHERE is_template = true ORDER BY name`
    );
    return r.rows;
  }

  async getTemplateById(templateId) {
    const r = await database.query(
      'SELECT * FROM workflows WHERE id = $1 AND is_template = true',
      [templateId]
    );
    return r.rows[0] || null;
  }

  async createFromTemplate(templateId, userId) {
    const template = await this.getTemplateById(templateId);
    if (!template) return null;
    const tasks = await this.listTasksByWorkflowId(templateId);
    const w = await database.query(
      `INSERT INTO workflows (user_id, name, description, is_template, trigger_type)
       VALUES ($1, $2, $3, false, 'manual') RETURNING *`,
      [userId, template.name + ' (copy)', template.description || null]
    ).then(r => r.rows[0]);
    const oldToNew = {};
    for (const t of tasks) {
      const r = await database.query(
        `INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type, sub_workflow_id)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'agent'), $7) RETURNING *`,
        [w.id, t.sort_order, t.name, t.agent_id, t.handoff_instructions, t.task_type, t.sub_workflow_id]
      );
      oldToNew[t.id] = r.rows[0].id;
    }
    for (const t of tasks) {
      if (t.next_step_id && oldToNew[t.next_step_id]) {
        await database.query(
          'UPDATE workflow_tasks SET next_step_id = $1 WHERE id = $2',
          [oldToNew[t.next_step_id], oldToNew[t.id]]
        );
      }
      if (t.branch_config && Array.isArray(t.branch_config)) {
        const updated = t.branch_config.map((b) => ({
          ...b,
          next_task_id: b.next_task_id && oldToNew[b.next_task_id] ? oldToNew[b.next_task_id] : b.next_task_id,
        }));
        await database.query(
          'UPDATE workflow_tasks SET branch_config = $1 WHERE id = $2',
          [JSON.stringify(updated), oldToNew[t.id]]
        );
      }
    }
    return this.getById(w.id, userId);
  }
}

module.exports = new WorkflowService();
