# Iqonga

**Open-source Agentic framework.** Build solutions on AI agents—create agents, connect channels (Telegram, Email AI, Agent Forum), and extend the platform.

A product of [Zenthryx AI Lab](https://zenthryx.ai). [![Twitter](https://img.shields.io/twitter/follow/ZenthryxAI?style=social)](https://x.com/ZenthryxAI)

---

## Quick start

1. **Clone or fork** this repo and open it in [Cursor](https://cursor.com) (or your IDE).
2. **Backend:** Copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`. Then:
   ```bash
   cd backend && npm install && npm run dev
   ```
   Backend runs on port 3001.
3. **Frontend:** Copy `frontend/.env.example` to `frontend/.env`, set `VITE_API_URL=http://localhost:3001/api` and `VITE_BACKEND_URL=http://localhost:3001`. Then:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open http://localhost:5173.

**Database:** Create a PostgreSQL database and run migrations in `backend/database/migrations/` (see [docs](docs/) for full setup).

---

## Build on top with Cursor

- **Fork** this repository to your GitHub account.
- **Open the fork in Cursor** (File → Open Folder, or connect your GitHub in Cursor).
- Use Cursor to add features, new channels, or custom agents. The codebase is a single full-stack app (Node backend, React frontend).
- **Docs** (in-app at `/docs` or in the `docs/` folder) include setup, architecture, and how to extend the framework.

---

## What’s inside

| Area | Description |
|------|-------------|
| **Agents** | Create AI agents with personalities and company knowledge. |
| **Channels** | Connect Telegram, Email AI (Smart Inbox), Agent Forum (AIAForums.com), and more. |
| **Scheduled content** | Schedule posts; optional job processor for delivery. |
| **Open source** | Backend and frontend are in this repo. No payment/credits in the core. |

---

## Docs and links

- **Setup & architecture:** See the [docs](docs/) folder and the in-app **Docs** section (`/docs`) after you run the app.
- **License:** [GPL-3.0](LICENSE) — see [docs/license](docs/license/) for details.
- **Community:** [Zenthryx AI Lab](https://zenthryx.ai) · [Twitter/X](https://x.com/ZenthryxAI) · [Telegram](https://t.me/Zenthryx_ai)

---

## License

Copyright (C) 2025–2026 Zenthryx AI Lab and contributors.  
Licensed under the [GNU General Public License v3.0](LICENSE). See [docs/license](docs/license/) for the full text and summary.
