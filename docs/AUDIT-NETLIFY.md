# Tiger-Onboarding-Worker — Audit & Netlify Migration

**Date:** 2026-06-07  
**Target:** Deploy `artifacts/tiger-prototype` to Netlify via `https://github.com/TheRuKa7/bluemachines_sample`

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Deployable artifact | ✅ Ready | `artifacts/tiger-prototype` — static Vite SPA |
| Backend dependency | ✅ None | Fully in-memory; no API/DB at runtime |
| Netlify config | ✅ Added | `netlify.toml` with build, publish, SPA redirects |
| Build env vars | ✅ Fixed | `PORT`/`BASE_PATH` now have defaults |
| Secrets / PII | ✅ Clean | No `.env`, keys, or real customer data |
| Replit coupling | ⚠️ Partial | Dev-only Replit Vite plugins; linux-only native overrides |
| Git remotes | ⚠️ Action needed | Currently points to Replit; add GitHub `origin` |
| Missing assets | ⚠️ Minor | `favicon.svg` referenced in HTML but not present |

**Verdict:** Safe to deploy the prototype to Netlify as a static site. No server-side functions required.

---

## What this project is

**Tiger Credit Card AI Voice Agent** — an interactive design prototype for Blue Machines enterprise review. It visualizes:

1. Card onboarding journey (8 stages)
2. Data flows between 10 internal systems
3. AI agent behavior per stage
4. Customer objection handling (7 scenarios)
5. Failure-mode simulation
6. Evaluation KPIs

Origin: Replit workspace (`Tiger-Onboarding-Worker`), pnpm monorepo with scaffolded but unused API/DB packages.

---

## Architecture

```
Tiger-Onboarding-Worker/          (pnpm workspace root)
├── artifacts/
│   ├── tiger-prototype/          ★ DEPLOY THIS — Vite + React SPA
│   ├── api-server/               Express 5 scaffold (unused)
│   └── mockup-sandbox/           Internal mockup tooling (not deployed)
├── lib/
│   ├── api-client-react/         Generated API client (unused by prototype)
│   ├── api-spec/                 OpenAPI (health only)
│   ├── api-zod/                  Zod schemas
│   └── db/                       Drizzle + PostgreSQL scaffold (unused)
└── scripts/                      Post-merge hooks (Replit)
```

### Data flow

```
User interaction
    → React state (selectedStage, selectedObjection, failureMode)
    → src/data/model.ts (in-memory STAGES, OBJECTIONS, SYSTEMS)
    → UI panels re-render
```

No `fetch()`, no WebSocket, no server.

### Key files

| File | Role |
|------|------|
| `artifacts/tiger-prototype/src/data/model.ts` | All prototype content |
| `artifacts/tiger-prototype/src/data/transcript.ts` | Call transcript dialogue |
| `artifacts/tiger-prototype/src/App.tsx` | Layout + global state |
| `artifacts/tiger-prototype/vite.config.ts` | Build config |

---

## Replit → Netlify compatibility audit

### Blockers found (fixed)

| Issue | Impact | Fix |
|-------|--------|-----|
| `vite.config.ts` threw if `PORT`/`BASE_PATH` unset | Netlify build would fail | Defaults: `4173`, `/` |
| Replit runtime error overlay in all builds | Unnecessary prod dependency | Gated to Replit dev only |
| No `netlify.toml` | Manual Netlify UI config | Added with build + redirects |
| No `README.md` | GitHub repo empty | Added |
| Meta tags said "built on Replit" | Wrong branding on deploy | Updated |

### Remaining Replit artifacts (non-blocking)

| Item | Netlify impact |
|------|----------------|
| `.replit`, `replit.md`, `artifact.toml` | Ignored by Netlify |
| `pnpm-workspace.yaml` linux-only esbuild/rollup overrides | ✅ Works on Netlify Linux; ❌ breaks local Windows rollup |
| `preinstall` uses `sh` | ✅ Works on Netlify Linux |
| Git remotes → `ssh.spock.replit.dev` | Must add GitHub `origin` |
| `@replit/vite-plugin-*` in devDependencies | Tree-shaken from prod build |

### Not needed on Netlify

- `artifacts/api-server` — Express server, no prototype dependency
- `lib/db` — PostgreSQL/Drizzle, unused
- Port 8080 / deployment router in `.replit`
- Replit autoscale deployment target

---

## Security audit

| Check | Result |
|-------|--------|
| Hardcoded API keys | None found |
| `.env` files committed | None |
| Real PII / customer data | None — all synthetic prototype data |
| Auth tokens in runtime | None — `setAuthTokenGetter` exists in unused API client |
| Supply-chain policy | `minimumReleaseAge: 1440` (1-day npm hold) — good practice |
| XSS surface | React JSX; no `dangerouslySetInnerHTML` in core components |

**Recommendation:** Keep repo public-safe. No secrets needed for Netlify deploy.

---

## Build verification

### Expected Netlify build

```bash
pnpm install          # corepack activates pnpm@10.12.4
pnpm run build:netlify
# Output: artifacts/tiger-prototype/dist/public/
```

### Local Windows caveat

Rollup native binary `@rollup/rollup-win32-x64-msvc` is excluded by workspace overrides (Replit linux-x64 optimization). Local Windows `pnpm run build:prototype` may fail. **Netlify Linux builds are unaffected.**

To fix local Windows dev, remove the `rollup>@rollup/rollup-win32-*` override lines from `pnpm-workspace.yaml`.

---

## Netlify configuration reference

```toml
# netlify.toml
[build]
  command = "pnpm run build:netlify"
  publish = "artifacts/tiger-prototype/dist/public"

[build.environment]
  NODE_VERSION = "22"
  PNPM_VERSION = "10.12.4"
  PORT = "4173"
  BASE_PATH = "/"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## GitHub setup checklist

```bash
cd Tiger-Onboarding-Worker

# Add or update GitHub remote
git remote add origin https://github.com/TheRuKa7/bluemachines_sample.git
# OR: git remote set-url origin https://github.com/TheRuKa7/bluemachines_sample.git

git push -u origin main
```

Then in Netlify: **Import from Git** → `bluemachines_sample` → deploy.

---

## Known limitations

1. **Prototype only** — not a production voice agent; no telephony, STT/TTS, or LLM integration
2. **No favicon** — `index.html` previously referenced `/favicon.svg` (removed; add `public/favicon.svg` if desired)
3. **Unused workspace packages** — api-server, db, mockup-sandbox add install time but don't affect deploy
4. **Node 24 on Replit vs 22 on Netlify** — prototype has no Node-24-specific APIs; 22 is safe

---

## Recommendations (optional, post-deploy)

1. Add `public/favicon.svg` for browser tab icon
2. Prune unused packages from workspace to speed CI (api-server, db, mockup-sandbox)
3. Add `engines.node` CI check in GitHub Actions
4. Consider renaming repo folder from `Tiger-Onboarding-Worker` to `bluemachines_sample` for clarity
