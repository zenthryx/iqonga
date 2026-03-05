# Iqonga documentation site

Documentation for [Iqonga](https://iqonga.org), built with [Docusaurus](https://docusaurus.io).

## Setup

- **Node:** 20+
- **Package manager:** npm

```bash
cd docs-site
npm install
```

## Commands

| Command        | Description                    |
|----------------|--------------------------------|
| `npm start`    | Start dev server (with hot reload) |
| `npm run build`| Build static site into `build/` |
| `npm run serve`| Serve the built site locally   |

## Deploy

The site is static. After `npm run build`, deploy the `build/` folder to any static host.

- **Vercel:** Link the repo and set the root to `docs-site` (or run build from repo root with `npm run build --workspace=docs-site` if using workspaces). Publish directory: `docs-site/build`.
- **Netlify:** Build command: `cd docs-site && npm install && npm run build`. Publish directory: `docs-site/build`.
- **GitHub Pages:** Use the `gh-pages` branch or GitHub Actions to push `build/` to `gh-pages`. Set the site’s base URL in `docusaurus.config.js` to your GitHub Pages URL (e.g. `https://<org>.github.io/<repo>/` and `baseUrl: '/<repo>/'`).

After deployment, set the docs base URL (e.g. `https://docs.iqonga.org`) and update in-app “View guide” links in the frontend to point to the deployed docs paths (e.g. `https://docs.iqonga.org/docs/guides/agent-teams`, `https://docs.iqonga.org/docs/guides/workflows`).
