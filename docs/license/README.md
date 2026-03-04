# Ajentrix AI

Open-source, self-hosted AI agent platform. Backend, frontend, and database.

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **PostgreSQL** 14+ (local or managed)
- **npm** or **pnpm**

## Quick start

1. **Database** — Create a PostgreSQL database and run the schema once:
   ```bash
   psql -U your_user -d your_db -f Backend/standalone_db/standalone_init.sql
   ```
   Set `DATABASE_URL` in `Backend/.env` (see [Setup guide](Docs/README-STANDALONE-SETUP.md#1-database-postgresql)).

2. **Backend** — Copy `Backend/.env.example` to `Backend/.env`, set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`/`BACKEND_URL`. Then:
   ```bash
   cd Backend && npm install && npm run dev
   ```
   Backend runs on port 3001.

3. **Frontend** — Copy `Frontend/.env.example` to `Frontend/.env`, set `VITE_API_URL=http://localhost:3001/api` and `VITE_BACKEND_URL=http://localhost:3001`. Then:
   ```bash
   cd Frontend && npm install && npm run dev
   ```
   Open http://localhost:5173.

**Verify:** `GET http://localhost:3001/health` returns `{ "ok": true }`. `GET http://localhost:3001/api/health` returns DB and env checks (no secrets).

Full details, options (Docker, managed DB, pgAdmin), migrations, and AI keys: **[Docs/README-STANDALONE-SETUP.md](Docs/README-STANDALONE-SETUP.md)**. **Deploy to a server** (e.g. www.3w.uk): **[Docs/DEPLOY-SERVER.md](Docs/DEPLOY-SERVER.md)**.

## Quick links

- **Setup (full):** [Docs/README-STANDALONE-SETUP.md](Docs/README-STANDALONE-SETUP.md)
- **License:** GNU GPL v3.0 — [LICENSE.md](LICENSE.md) (summary), [COPYING](COPYING) (full text)
- **Scope & tasks:** [Docs/RELEASE-SCOPE.md](Docs/RELEASE-SCOPE.md), [Docs/TASK-LIST-STANDALONE.md](Docs/TASK-LIST-STANDALONE.md)

## License

Copyright (C) 2026 Zenthryx Lab and contributors. See [NOTICE](NOTICE) and [COPYING](COPYING).
