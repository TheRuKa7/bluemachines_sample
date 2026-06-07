# bluemachines_sample

Interactive enterprise prototype demonstrating **Tiger Credit Card's AI voice-agent onboarding system** — built for Blue Machines panel review.

## Live demo

Deploy to Netlify from this repo. After connecting GitHub, Netlify reads `netlify.toml` and publishes the Vite build at `artifacts/tiger-prototype/dist/public`.

## What this is

A single-page React prototype covering:

- **Journey stages** — 8 states from Card Approved through Active and Escalated
- **System flow diagram** — animated READ/WRITE/NOTIFY/ESCALATE arrows across 10 internal systems
- **Agent behavior panel** — stage-specific goals, prompts, guardrails, compliance notes
- **Objection scenarios** — 7 customer objection types with resolution logic
- **Failure mode** — simulated system degradation with fallback behavior
- **Eval metrics** — 6 KPIs with directional indicators

All data is in-memory. No backend, database, or API calls at runtime.

## Stack

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| Routing | wouter (client-side) |
| Node | 22+ (24 on Replit) |

## Local development

```bash
# Install (requires pnpm — use corepack enable on Node 22+)
pnpm install

# Run prototype dev server (port 19981 on Replit, 4173 default elsewhere)
PORT=19981 BASE_PATH=/ pnpm run dev:prototype

# Production build
pnpm run build:prototype
```

On Windows, set env vars in PowerShell:

```powershell
$env:PORT="4173"; $env:BASE_PATH="/"; pnpm run dev:prototype
```

> **Note:** `pnpm-workspace.yaml` excludes non-Linux native binaries (esbuild/rollup) for Replit's linux-x64 environment. Local Windows builds may fail on rollup; Netlify (Linux) builds work correctly.

## Project layout

```
artifacts/tiger-prototype/   ← deployable SPA (this is what Netlify publishes)
  src/data/model.ts          ← single source of truth for all prototype content
  src/components/            ← UI panels and modals
lib/                         ← shared API/DB scaffolds (unused by prototype)
artifacts/api-server/        ← Express scaffold (unused)
```

## Deploy to Netlify via GitHub

### 1. Push to GitHub

```bash
git remote add origin https://github.com/TheRuKa7/bluemachines_sample.git
# If origin already exists with another URL:
# git remote set-url origin https://github.com/TheRuKa7/bluemachines_sample.git

git push -u origin main
```

### 2. Connect Netlify

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** → select `TheRuKa7/bluemachines_sample`
3. Netlify auto-detects settings from `netlify.toml`:
   - **Build command:** `pnpm run build:netlify`
   - **Publish directory:** `artifacts/tiger-prototype/dist/public`
4. Deploy

No environment variables are required for the prototype. `PORT` and `BASE_PATH` defaults are set in `netlify.toml`.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm run dev:prototype` | Vite dev server |
| `pnpm run build:prototype` | Production build |
| `pnpm run build:netlify` | Netlify CI build (same as prototype) |
| `pnpm run typecheck` | Full workspace typecheck |

## Audit

See [`docs/AUDIT-NETLIFY.md`](docs/AUDIT-NETLIFY.md) for architecture review, Replit→Netlify migration notes, and known limitations.

## License

MIT
