# Tiger Credit Card AI Voice Agent

Interactive enterprise prototype demonstrating Tiger Credit Card's AI voice-agent onboarding system design — built for Blue Machines panel review. Shows data flows, journey state transitions, agent logic, objection handling, and evaluation metrics in a single interactive interface.

## Run & Operate

- `pnpm --filter @workspace/tiger-prototype run dev` — run the prototype (port 19981, previews at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4
- No backend dependencies — fully self-contained in-memory data
- API: Express 5 (scaffolded, unused by prototype)
- DB: PostgreSQL + Drizzle ORM (scaffolded, unused by prototype)

## Where things live

- `artifacts/tiger-prototype/src/data/model.ts` — complete in-memory data model (source of truth for all prototype content)
- `artifacts/tiger-prototype/src/components/` — all UI components
- `artifacts/tiger-prototype/src/App.tsx` — main layout and shared state
- `lib/api-spec/openapi.yaml` — API contract (health check only)

## Product

A single-page interactive prototype covering:
- **Journey Stage Selector** — 8 states from Card Approved through Active and Escalated
- **System Interaction Flow** — SVG block diagram with animated READ/WRITE/NOTIFY/ESCALATE arrows for 10 internal systems
- **Agent Behavior Panel** — stage-specific agent goal, next best action, prompt scaffold, guardrails, compliance notes
- **Objection Scenarios** — 7 objection types with data dependency mapping (Joining Fee, Jewels Cashback, Credit Limit, Already Have Card, Deactivation, KYC Complexity, Ad Mismatch)
- **System Failure Toggle** — simulates degraded state with affected system highlighting and fallback logic
- **Eval Metrics Bar** — 6 KPIs (Stage Completion, Containment, Escalation, Time to Activation, Drop-off Recovery, CSAT) with directional indicators

## Architecture decisions

- All prototype data is in-memory — no backend calls, fully self-contained and fast
- SVG-based system flow diagram chosen for precise control over arrow positions and animation
- Stage selection drives all three panels simultaneously via shared React state
- Objection overlay appends to the Agent Logic tab rather than replacing it, preserving stage context

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Prototype is fully frontend-only; the API server and DB packages are scaffolded but unused
- After any change to `src/data/model.ts`, all three panels update automatically — no other files need changing for content edits
