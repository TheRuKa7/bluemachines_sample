# Blue Machines Assignment — Submission Index

**Candidate:** Rushil Kaul  
**Role:** AI Product Operations & Solutions  
**Deadline:** 8 June 2026

## Deliverables checklist

| # | Assignment requirement | Status | Where |
|---|---------------------|--------|-------|
| 1 | System interaction design (triggers, data direction, dependencies) | ✅ | Interactive prototype + Case Study §3 |
| 2 | Failure / fallback handling | ✅ | Failure Mode in prototype + Case Study §3.5 |
| 3 | Compliance in orchestration | ✅ | Guardrails tab + Compliance system |
| 4 | VAPI base prompt (full) | ✅ | [`VAPI_SYSTEM_PROMPT.md`](VAPI_SYSTEM_PROMPT.md) |
| 5 | Eval prompt / metrics | ✅ | [`EVAL_PROMPT.md`](EVAL_PROMPT.md) |
| 6 | 7 objection scenarios (data-backed) | ✅ | `model.ts` OBJECTIONS + Case Study §6 |
| 7 | Avoid STT / engineering workflow | ✅ | Design-only scope throughout |

## Files to submit / present

1. **Case Study DOCX** — `docs/submission/Blue_Machines_Case_Study_Submission_Rushil_Kaul.docx`
2. **Internal Notes DOCX** (your prep) — `docs/submission/Blue_Machines_Internal_Working_Notes_Rushil_Kaul.docx`
3. **GitHub repo** — https://github.com/TheRuKa7/bluemachines_sample
4. **VAPI assistant** — create from [`VAPI_SYSTEM_PROMPT.md`](VAPI_SYSTEM_PROMPT.md), share assistant link if required

## Panel demo order (3 min)

1. APPROVED stage → READ flows  
2. EKYC_PENDING → drop-off recovery  
3. Joining Fee objection → data deps  
4. Failure Mode → no guessing  
5. Transcript → thinking turns  
6. Mention VAPI + eval docs  

## Regenerate documents

```bash
python docs/scripts/generate_submission_docx.py
```

Writes to `docs/submission/` and `~/Downloads/`.
