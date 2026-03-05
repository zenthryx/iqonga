---
sidebar_position: 2
title: Workflows
---

# Workflows – User Guide

Workflows run a sequence of steps. Each step can be an **agent** (AI does the work), an **approval** (pause for human approve/reject), a **router** (branch by condition), or a **sub-workflow** (call another workflow). Steps run in order unless a router sends the flow elsewhere.

---

## What are Workflows?

- A **workflow** is a named definition: a list of **steps** (tasks).
- Each step has a **type** and, for agent steps, an **agent** and optional **handoff instructions**.
- You **run** a workflow with an initial prompt; the result is a **run** (execution) with output per step and an aggregated result.
- You can trigger workflows **manually**, on a **schedule** (cron), or via **webhook**.

---

## How to create a workflow

1. Go to **CORE → Workflows**.
2. Click **New workflow** and choose:
   - **Blank workflow** – start from scratch, or  
   - **From template** – copy a template (e.g. "Research and Draft", "Content Review") then edit.
3. Give the workflow a **Name** and optional **Description**.
4. Click **Add step** and add one or more steps (see step types below).
5. Optionally set **Trigger** (manual, schedule, or webhook).
6. Use **Run workflow** to test with an initial prompt.

---

## Step types

| Type | What it does | When to use |
|------|----------------|-------------|
| **Agent** | One of your AI agents runs with the current context and handoff instructions. | Research, draft, classify, respond, etc. |
| **Approval** | Execution pauses until a human approves or rejects. | Content review, compliance checks, go/no-go. |
| **Router** | Branches to a next step based on the previous step's output (e.g. "if output contains X"). | Triage, routing by category, conditional paths. |
| **Sub-workflow** | Runs another workflow and uses its result as this step's output. | Reusable sub-flows (e.g. "validate" then "respond"). |

---

## Field guide

### Workflow level

| Field | Guidance |
|-------|----------|
| **Name** | Short, clear name (e.g. "Research and Draft", "Support Triage"). |
| **Description (optional)** | What the workflow does and when to use it. |
| **Template** | "Available as template for others" – when checked, this workflow appears in the template list when others create a workflow. |
| **Trigger** | **Manual only** – run from the UI or API when you choose. **Schedule (cron)** – run automatically (e.g. `0 9 * * 1-5` for 9am weekdays). **Webhook** – run when an external system calls the webhook URL (optional secret for auth). |
| **Cron** | Only when Trigger = Schedule. Standard 5-field cron: minute hour day-of-month month day-of-week (e.g. `0 9 * * 1-5`). |
| **Webhook secret** | Optional. If set, callers must send this in `X-Webhook-Token` header or `?token=` to trigger the workflow. |
| **Webhook URL** | Shown when Trigger = Webhook. Use **Copy** to get the full URL for POST requests. |

### Step level (Add step)

| Field | Guidance |
|-------|----------|
| **Step type** | Agent, Approval, Router, or Sub-workflow (see table above). |
| **Step name** | Label for this step (e.g. "Research", "Human approval"). |
| **Agent** | (Agent steps only.) Which agent runs this step. |
| **Workflow** | (Sub-workflow steps only.) Which workflow runs as this step. Cannot be the current workflow (no circular refs). |
| **Default next step** | (Router steps only.) Fallback step when no branch condition matches. |
| **Handoff instructions** | (Optional.) Instructions for this step (e.g. "Use the previous summary and draft a 300-word post"). |

### Router branches (Configure branches)

For **Router** steps, use the **Configure** (pencil) button to add branches:

| Concept | Guidance |
|--------|----------|
| **If output contains** | When the previous step's output contains this text (case-insensitive), go to the selected next step. |
| **Default (else)** | When no other condition matches, go to this step. One default is enough. |
| **Next step** | The step to run when the condition matches. |

---

## Running and viewing runs

- **Run workflow**: Enter an optional **Initial prompt** and click **Run**. The workflow runs step by step; if an approval step is hit, it pauses until you **Approve** or **Reject**.
- **Recent runs**: List of past runs with status and time. Click a run to load its result.
- **Run result**: Shows status, duration, each step's input/output, and the aggregated output. If the run is waiting for approval, **Approve** and **Reject** appear here.

---

## Templates

- **Use a template**: When creating a workflow, choose **From template** and pick one (e.g. "Research and Draft", "Content Review"). You get a copy you can edit.
- **Make your workflow a template**: In the workflow, check **Available as template for others**. It will appear in the template list for users who create workflows.

---

## Triggers

- **Manual**: Run from the Workflows UI or `POST /api/workflows/:id/run` with your auth.
- **Schedule**: Set Trigger to Schedule and a cron expression; the server runs the workflow at matching times (e.g. daily digest).
- **Webhook**: Set Trigger to Webhook, optionally set a secret, then POST to the webhook URL (with `X-Webhook-Token` or `?token=` if secret is set). Body can include `input_prompt` or any JSON; it is passed as context.

---

## Tips

- Start from a **template** to get a ready-made sequence (e.g. Research → Draft, or Draft → Approval → Summary).
- Use **Approval** steps for content review or compliance before continuing.
- Use **Router** + "Configure branches" to branch by keyword or category (e.g. "if output contains 'refund' → step X").
- Use **Sub-workflow** to reuse a flow inside another (e.g. "Validate request" workflow inside "Full support" workflow). Circular references are blocked.
- Check **Recent runs** and the run result panel to debug and to approve paused runs.

---

## See also

- [Agent Teams Guide](/docs/guides/agent-teams) – Group agents used in workflow steps.
- [Workflow Enhancements](/docs/development/workflow-enhancements) – Technical implementation details.
