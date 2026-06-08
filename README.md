# bluemachines_sample

Interactive prototype: **Tiger Credit Card AI voice-agent onboarding system** — system flows, journey stages, agent logic, objections, failure mode, and eval metrics.

## Live demo

Deploy via Netlify from this repo. `netlify.toml` publishes `artifacts/tiger-prototype/dist/public`.

**GitHub:** https://github.com/TheRuKa7/bluemachines_sample

This repo is the interactive prototype only. Case study and interview-prep PDFs stay local (not committed).

**Local docs:** run `py -3.12 local/generate_docs.py` → outputs to `~/Downloads`. See `local/README.md`.

## Prototype features

- 8 journey stages (Approved → Active + Escalated)
- System flow diagram with READ / WRITE / NOTIFY / ESCALATE
- Agent panel: logic, data fields, guardrails, per-stage prompt scaffolds
- 7 objection scenarios with data dependencies
- Failure mode simulation
- Simulated call flow transcript (READ/WRITE/NOTIFY annotations)
- **Live VAPI voice call** — Talk to Aria with stage/objection/failure context
- Live eval metrics + per-call audit log (computed from live calls)
- Post-call agent star rating (CSAT)

Journey data is in-memory; VAPI powers live web calls via Netlify Function + Web SDK.

## Local development

```bash
pnpm install
PORT=4173 BASE_PATH=/ pnpm run dev:prototype   # bash
pnpm run build:prototype
```

PowerShell: `$env:PORT="4173"; $env:BASE_PATH="/"; pnpm run dev:prototype`

## Layout

```
artifacts/tiger-prototype/src/data/model.ts   ← source of truth
artifacts/tiger-prototype/src/components/     ← UI
```

## Netlify

Build: `pnpm run build:netlify` · Publish: `artifacts/tiger-prototype/dist/public`

VAPI keys and assistant ID are in `netlify.toml` (interview prototype — rotate after use).  
`GET /api/vapi-session?stage=APPROVED` patches the assistant server-side before each call.

**Live call tips:** Chrome/Edge desktop, allow microphone, use headphones to avoid echo. Mute toggle in the call panel.

## Assignment checklist (verified)

| Requirement | Status |
|-------------|--------|
| 8 journey stages + Escalated branch | ✓ |
| 10-system data flow (READ/WRITE/NOTIFY/ESCALATE) | ✓ |
| Agent panel: logic, data fields, prompt & guardrails | ✓ |
| 7 objection scenarios with data dependencies | ✓ |
| Failure / stale-data simulation | ✓ |
| Live eval + audit log (per call, not preloaded) | ✓ |
| Post-call agent rating | ✓ |
| Simulated call-flow transcript | ✓ |
| Live VAPI voice agent (stage-aware prompt) | ✓ |

## License

MIT
