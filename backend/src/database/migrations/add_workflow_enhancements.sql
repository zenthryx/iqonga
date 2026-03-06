-- Workflow enhancements: task types (agent/router/approval/sub_workflow), triggers, approval resolution, sub-workflows, templates.
-- Run after add_workflows_and_agent_teams.sql: psql $DATABASE_URL -f add_workflow_enhancements.sql

-- Workflows: templates and triggers
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS schedule_cron VARCHAR(255),
  ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_workflows_is_template ON workflows(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON workflows(trigger_type);

-- Workflow tasks: task type, branching, sub-workflow
ALTER TABLE workflow_tasks
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS next_step_id UUID REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_config JSONB,
  ADD COLUMN IF NOT EXISTS sub_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;

-- Allow agent_id NULL for router, approval, sub_workflow steps
ALTER TABLE workflow_tasks ALTER COLUMN agent_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_next_step_id ON workflow_tasks(next_step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_sub_workflow_id ON workflow_tasks(sub_workflow_id);

-- Workflow executions: parent link for sub-workflow runs
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS parent_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_step_id UUID REFERENCES workflow_execution_steps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_executions_parent ON workflow_executions(parent_execution_id);

-- Workflow execution steps: approval resolution
ALTER TABLE workflow_execution_steps
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolution VARCHAR(20);

-- Allow agent_id NULL for approval steps (no agent run)
ALTER TABLE workflow_execution_steps ALTER COLUMN agent_id DROP NOT NULL;

COMMENT ON COLUMN workflows.is_template IS 'If true, workflow appears in template list for copy';
COMMENT ON COLUMN workflows.trigger_type IS 'manual | schedule | webhook';
COMMENT ON COLUMN workflows.schedule_cron IS 'Cron expression when trigger_type is schedule';
COMMENT ON COLUMN workflow_tasks.task_type IS 'agent | router | approval | sub_workflow';
COMMENT ON COLUMN workflow_tasks.branch_config IS 'For router: [{ condition, value?, next_task_id }, ...] with default';
COMMENT ON COLUMN workflow_execution_steps.resolution IS 'approved | rejected for approval steps';
COMMENT ON COLUMN workflow_executions.parent_execution_id IS 'Set when this run is a sub-workflow of another execution';
COMMENT ON COLUMN workflow_executions.parent_step_id IS 'Parent execution step that invoked this sub-workflow';