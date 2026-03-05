---
sidebar_position: 1
title: Deployment
---

# Deployment

This page summarizes how to host Iqonga: an optional **platform instance** (e.g. for development or internal use) and the **documentation site** at **iqonga.org**.

## Overview

| Site | Purpose | Content |
|------|---------|---------|
| **www.iqonga.org / iqonga.org** | Documentation site | This site: docs, showcase, GitHub. Information about the open-source framework, how to use it, and platforms built with it. |
| **Optional platform host** | Your own instance | Full app (frontend + backend). Login, dashboard, agents, workflows, channels. Deploy for your team or product; not required for using the docs. |

---

## Optional platform instance (e.g. your-app.example.com)

If you run your own instance of the Iqonga platform (for development or as your product):

- **Code:** On server at e.g. `/var/www/your-app/` (backend + frontend).
- **Build frontend:** `cd frontend && npm ci && npm run build`. Output is `frontend/dist/`.
- **Run backend:** e.g. with PM2: `pm2 start backend/src/server.js --name iqonga-api` (from repo root), or run on port 3001.
- **Nginx:** Root = `frontend/dist`; proxy `/api/` and `/uploads/` to `http://127.0.0.1:3001`.

**Example Nginx enable (replace with your hostname):**

```bash
# Copy the example platform config from the repository and adapt for your hostname.
sudo cp docs/deployment/nginx-platform-example.conf /etc/nginx/sites-available/your-app.conf
sudo ln -s /etc/nginx/sites-available/your-app.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Env:** Set `VITE_API_URL=https://your-app.example.com/api` when building the frontend for production.

---

## www.iqonga.org (documentation site)

- **Content:** This Docusaurus site in `docs-site/`.
- **Deploy:** Build and serve the `docs-site` output (see below).

---

## Documentation site (this site)

To deploy this Docusaurus docs site:

```bash
cd docs-site
npm ci
npm run build
```

Output is in `build/`. Serve that directory with Nginx (or deploy to Vercel/Netlify/GitHub Pages by connecting the repo and setting the build directory to `docs-site` and build command to `npm run build`).

---

## SSL (recommended)

Use Let's Encrypt for your domain(s):

```bash
sudo certbot --nginx -d www.iqonga.org -d iqonga.org
# For your optional platform host:
# sudo certbot --nginx -d your-app.example.com
```

Then reload Nginx.
