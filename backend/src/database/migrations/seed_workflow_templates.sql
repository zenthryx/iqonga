-- Seed workflow templates. Run after add_workflow_enhancements.sql.
-- Requires at least one user. Uses first user's first agent for agent steps if available.
-- psql $DATABASE_URL -f seed_workflow_templates.sql

-- Helper: get first user id
DO $$
DECLARE
  first_user_id UUID;
  first_agent_id UUID;
  w_id UUID;
BEGIN
  SELECT id INTO first_user_id FROM users ORDER BY created_at ASC LIMIT 1;
  IF first_user_id IS NULL THEN RETURN; END IF;

  SELECT id INTO first_agent_id FROM ai_agents WHERE user_id = first_user_id LIMIT 1;

  -- 1. Research and Draft
  IF NOT EXISTS (SELECT 1 FROM workflows WHERE is_template = true AND name = 'Research and Draft') THEN
    INSERT INTO workflows (user_id, name, description, is_template)
    VALUES (first_user_id, 'Research and Draft', 'Two-step workflow: research a topic, then draft content. Good for reports, articles, or briefs.', true)
    RETURNING id INTO w_id;
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 0, 'Research', first_agent_id, 'Research the topic thoroughly and summarize key points.', 'agent');
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 1, 'Draft', first_agent_id, 'Using the research summary, draft the final content.', 'agent');
  END IF;

  -- 2. Support Triage
  IF NOT EXISTS (SELECT 1 FROM workflows WHERE is_template = true AND name = 'Support Triage') THEN
    INSERT INTO workflows (user_id, name, description, is_template)
    VALUES (first_user_id, 'Support Triage', 'Triage incoming requests: classify then respond. You can add a Router step later to branch by category.', true)
    RETURNING id INTO w_id;
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 0, 'Classify', first_agent_id, 'Classify the request: category (e.g. billing, technical) and priority.', 'agent');
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 1, 'Respond', first_agent_id, 'Using the classification, draft a helpful response.', 'agent');
  END IF;

  -- 3. Content Review (with approval step)
  IF NOT EXISTS (SELECT 1 FROM workflows WHERE is_template = true AND name = 'Content Review') THEN
    INSERT INTO workflows (user_id, name, description, is_template)
    VALUES (first_user_id, 'Content Review', 'Draft content, then pause for human approval. Uses an approval (human-in-the-loop) step.', true)
    RETURNING id INTO w_id;
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 0, 'Draft', first_agent_id, 'Draft the content based on the user request.', 'agent');
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 1, 'Human approval', NULL, NULL, 'approval');
    INSERT INTO workflow_tasks (workflow_id, sort_order, name, agent_id, handoff_instructions, task_type)
    VALUES (w_id, 2, 'Publish summary', first_agent_id, 'The content was approved. Summarize what was approved.', 'agent');
  END IF;
END $$;
