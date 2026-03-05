---
sidebar_position: 2
title: Build with Cursor
---

# Build a solution with Iqonga using Cursor

Use **Cursor** to go from a fork of Iqonga to a running stack and your own solution.

## Steps at a glance

1. **Fork** [github.com/zenthryx/iqonga](https://github.com/zenthryx/iqonga) and **clone** your fork.
2. **Open** the project folder in Cursor (**File → Open Folder**).
3. **Backend:** `cd backend && npm install`, set `.env` (DATABASE_URL, JWT_SECRET, optional SMTP), run migrations, then `npm run dev`.
4. **Frontend:** In a new terminal, `cd frontend && npm install`, set `VITE_API_URL=http://localhost:3001/api` in `.env`, then `npm run dev`.
5. **Verify:** Log in (magic code), open AI Agents and Workflows — no 404s in DevTools.
6. **Extend:** Add agents, workflows, or new routes; use Cursor to explain, refactor, and debug.

## Full guide

The full step-by-step guide (prerequisites, migrations, SMTP, deployment checklist) is in the repo:

- **[docs/BUILD-WITH-CURSOR-IQONGA.md](https://github.com/zenthryx/iqonga/blob/main/docs/BUILD-WITH-CURSOR-IQONGA.md)** (or open that file in your cloned repo).

## Troubleshooting

If you see 404s for `/api/workflows` or `/api/agents`, or issues with SMTP or upload URLs, see:

- **[docs/DEPLOYMENT-TROUBLESHOOTING.md](https://github.com/zenthryx/iqonga/blob/main/docs/DEPLOYMENT-TROUBLESHOOTING.md)** in the repo.

## Quick commands

| Goal            | Command |
|-----------------|--------|
| Backend run     | `cd backend && npm run dev` |
| Frontend run    | `cd frontend && npm run dev` |
| Frontend build  | `cd frontend && npm run build` |

Then deploy with a reverse proxy (e.g. Nginx) as described in [Deployment](/docs/deployment).
