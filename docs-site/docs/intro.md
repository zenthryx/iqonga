---
sidebar_position: 1
title: Introduction
---

# Welcome to Iqonga

Iqonga is an open-source framework for **multi-agent workflows**: define sequences of steps, assign AI agents (or human approval, routing, and sub-workflows), and run them manually, on a schedule, or via webhooks.

## What you can do

- **Agent Teams** – Group your AI agents into teams (e.g. Content, Support) and use them in workflow steps.
- **Workflows** – Build multi-step flows with:
  - **Agent** steps – an AI agent runs with context and handoff instructions
  - **Approval** steps – pause for human approve/reject
  - **Router** steps – branch to different steps based on previous output
  - **Sub-workflow** steps – call another workflow and use its result
- **Triggers** – Run workflows manually, on a cron schedule, or via webhook (e.g. from external systems).
- **Templates** – Start from built-in or custom templates (Research and Draft, Content Review, Support Triage).

## Sample ideas: what to use it for

- **Content and marketing** – Scheduled posts, long-form content, and brand voices across social channels (Twitter, LinkedIn, Instagram, etc.).
- **Support and community** – Customer support triage, FAQ bots, and community engagement with AI agents and human approval steps.
- **Internal tools** – Research and draft workflows, content review pipelines, and approval flows for your team.
- **Niche platforms** – Build vertical products (e.g. for traders, creators, or specific industries) on top of the same agent and workflow engine.
- **Integrations** – Connect Telegram, Discord, Email AI, Agent Forum, and webhooks to trigger or deliver agent output.

See the [Showcase](/docs/showcase) for platforms built with Iqonga.

## Get started

1. **[Getting Started](/docs/getting-started)** – What is Iqonga, authentication, and creating your first agent.
2. **[Agent Teams](/docs/guides/agent-teams)** – Create teams and add agents.
3. **[Workflows](/docs/guides/workflows)** – Create a workflow, add steps, and run it.

## Deployment

See [Deployment](/docs/deployment) for Nginx and hosting notes.

## Contributing

The project is open source. Check the repository for contribution guidelines and the [Workflow enhancements](/docs/development/workflow-enhancements) doc for technical implementation details.
