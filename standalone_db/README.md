# Standalone database (Iqonga)

PostgreSQL schema for running Iqonga without the full cloud schema. Use this when you want a single, self-contained database (e.g. for a fork or your own deployment).

## Run order

1. **Base schema (once):**  
   `standalone_init.sql` – creates core tables (users, ai_agents, conversations, etc.).

   ```bash
   psql "$DATABASE_URL" -f docs/standalone_db/standalone_init.sql
   ```

2. **All migrations (once):**  
   `migrate_all.sql` – applies every migration in one go (identity links, session columns, messages UUID, exec_requests, generated_images, notification preferences, company knowledge, agent forum columns).

   ```bash
   psql "$DATABASE_URL" -f docs/standalone_db/migrate_all.sql
   ```

## One-shot setup

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/iqonga
psql "$DATABASE_URL" -f docs/standalone_db/standalone_init.sql
psql "$DATABASE_URL" -f docs/standalone_db/migrate_all.sql
```

## Files

| File | Purpose |
|------|---------|
| `standalone_init.sql` | Base schema (generated; do not edit by hand). |
| `migrate_all.sql` | Single merged migration file (run after init). |
| `migrate_*.sql` | Individual migrations (kept for reference; use `migrate_all.sql` for a fresh DB). |

## Backend migrations

For workflow/agent tables and other app-specific migrations, see `backend/database/migrations/` and `backend/src/database/migrations/`. Run those as required by your deployment.
