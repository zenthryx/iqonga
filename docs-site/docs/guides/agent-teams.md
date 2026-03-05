---
sidebar_position: 1
title: Agent Teams
---

# Agent Teams – User Guide

Agent Teams let you group AI agents into named teams. Teams are used when building **workflows**: each workflow step can be assigned an agent, and organizing agents into teams makes it easier to manage multi-agent flows.

---

## What are Agent Teams?

- **A team** is a named list of agents (e.g. "Content team", "Support triage").
- Teams do not run by themselves; they are **containers** for agents you use in workflows.
- When you define a workflow step, you pick **one agent** (from any team or from your full agent list). Teams help you keep those agents organized.

---

## How to create a team

1. Go to **CORE → Agent Teams** in the sidebar.
2. Click **New team**.
3. Enter a **Name** (e.g. "Content writers") and optional **Description**.
4. Click **Add agent** and select agents to add. You can add multiple agents; each can only be in the team once.
5. Save by clicking outside the field or changing focus (changes auto-save).

---

## Field guide

| Field | Guidance |
|-------|----------|
| **Name** | Short, clear name for the team (e.g. "Support agents", "Marketing"). |
| **Description (optional)** | What the team is for (e.g. "Agents used for customer support workflows"). |
| **Members** | The list of agents in this team. Add agents with **Add agent**; remove with **Remove**. Use workflows to assign these agents to steps. |

---

## Using teams with workflows

1. Create one or more **Agent Teams** and add agents to them.
2. Create a **Workflow** (CORE → Workflows).
3. For each workflow step of type **Agent**, choose which agent runs that step. You can pick any of your agents; teams are for organization, not restriction.
4. Run the workflow; each step runs with its assigned agent, and context is passed between steps via handoff instructions.

---

## Tips

- Create a team per role or use case (e.g. "Researchers", "Editors", "Approvers") so workflows are easier to configure.
- You can use the same agent in multiple teams.
- To remove an agent from a team, click **Remove** next to their name in the Members list.

---

## See also

- [Workflows Guide](/docs/guides/workflows) – Define multi-step flows and use agents (and teams) in each step.
