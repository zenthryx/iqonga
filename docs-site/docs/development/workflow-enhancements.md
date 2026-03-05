---
sidebar_position: 2
title: Workflow Enhancements (technical)
---

# Workflow Enhancements – Implementation Plan

This document reviews the workflow schema and implementation status for: conditional branching, human-in-the-loop, sub-workflows, triggers, router node, observability, and templates.

---

## Current schema (summary)

- **workflows** – id, user_id, name, description, is_template, trigger_type, schedule_cron, webhook_secret
- **workflow_tasks** – id, workflow_id, sort_order, name, agent_id, handoff_instructions, task_type, next_step_id, branch_config, sub_workflow_id
- **workflow_executions** – id, workflow_id, user_id, input_prompt, status, aggregated_output, parent_execution_id, parent_step_id
- **workflow_execution_steps** – id, execution_id, workflow_task_id, agent_id, input_text, output_text, status, approved_by, approved_at, resolution

---

## Implementation status

| Feature | Status |
|---------|--------|
| Migration (task types, triggers, approval, sub-workflows, templates) | Done |
| Observability (list executions, duration, step I/O) | Done |
| Templates (list, create from template, seed) | Done |
| Triggers (manual, schedule cron, webhook) | Done |
| Human-in-the-loop (approval step, pause/resume) | Done |
| Router + branching (branch_config, graph execution) | Done |
| Sub-workflows (inline run, parent link, cycle check) | Done |
| Run detail (steps with I/O, duration) | Done |
| Router branch config UI | Done |
| Cycle check (no circular sub-workflow) | Done |
| Webhook URL copy | Done |

---

## Router branch config

For **router** steps, `branch_config` is a JSON array of rules:

- `condition`: `"output_contains"` or `"default"`
- `value`: (for output_contains) text to match in the previous step's output (case-insensitive)
- `next_task_id`: UUID of the workflow task to run when the condition matches

Execution evaluates rules in order; the first matching rule determines the next step. Use a **default** rule as fallback.

---

## Triggers

- **Manual** – `POST /api/workflows/:id/run` with auth and `input_prompt`.
- **Schedule** – Server runs a scheduler every minute; workflows with `trigger_type = 'schedule'` and a valid `schedule_cron` are run at matching times.
- **Webhook** – `POST /api/workflows/:id/trigger` (no auth). Optional `X-Webhook-Token` or `?token=` must match `webhook_secret` if set.

---

## See also

- [Workflows user guide](/docs/guides/workflows)
- [Deployment](/docs/deployment)
