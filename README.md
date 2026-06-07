# bluemachines_sample

Interactive prototype: **Tiger Credit Card AI voice-agent onboarding system** — system flows, journey stages, agent logic, objections, failure mode, and eval metrics.

## Live demo

Deploy via Netlify from this repo. `netlify.toml` publishes `artifacts/tiger-prototype/dist/public`.

**GitHub:** https://github.com/TheRuKa7/bluemachines_sample

This repo is the interactive prototype only. Case study and interview-prep PDFs stay local (not committed).

## Prototype features

- 8 journey stages (Approved → Active + Escalated)
- System flow diagram with READ / WRITE / NOTIFY / ESCALATE
- Agent panel: logic, data fields, guardrails, per-stage prompt scaffolds
- 7 objection scenarios with data dependencies
- Failure mode simulation
- Call transcripts with reasoning turns
- 6 eval KPIs

All data is in-memory — no backend at runtime.

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

## License

MIT
