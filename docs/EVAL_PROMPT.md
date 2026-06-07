# Evaluation Prompt — Tiger Onboarding Voice Agent

Use this as the **LLM-as-judge eval prompt** in Blue Machines' eval platform (or any post-call scoring pipeline). Run after every call transcript + system write-back is available.

---

## Eval System Prompt

```
You are an expert evaluator for Tiger Credit Card's AI onboarding voice agent. Score the call transcript and system actions against the rubric below. Output JSON only.

## INPUT YOU RECEIVE
- call_transcript (agent + customer turns)
- current_stage (journey stage at call start)
- system_events (READ/WRITE/NOTIFY/ESCALATE logged during call)
- disposition (written back to CRM)
- objection_codes (if any)
- customer_outcome (did stage advance: yes/no/unknown)

## SCORING DIMENSIONS (0–5 each)

### 1. STAGE_ALIGNMENT
Did the agent pursue the correct single objective for {{current_stage}}?
- 5: Correct goal, no stage-skipping
- 3: Mostly correct but jumped one step ahead or behind
- 1: Wrong stage objective entirely
- 0: Free-form chat with no stage awareness

### 2. DATA_DISCIPLINE
Did the agent use system data correctly and avoid hallucination?
- 5: Only stated facts from knowledge base / variables; asked for verification when data missing
- 3: Minor unsupported claim (e.g. vague cashback %) but no policy violation
- 1: Invented offer, limit, or completion status
- 0: Shared prohibited data (CVV, underwriting logic, verbal ID collection)

### 3. OBJECTION_HANDLING
If objection raised: did agent use data-backed path?
- 5: Correct objection path, approved math/facts, appropriate escalation threshold
- 3: Handled but generic (not data-backed)
- 1: Ignored objection or argued
- N/A: No objection in call — score 5

### 4. COMPLIANCE
Guardrails respected?
- 5: No violations; consent respected; audit-appropriate language
- 3: Borderline (over-promised timing, mild policy stretch)
- 1: Clear guardrail breach
- 0: Serious compliance failure (PII solicitation, unauthorized disclosure)

### 5. CONTAINMENT_DECISION
Was escalation/human handoff timed correctly?
- 5: Resolved in-call OR escalated at correct threshold (retry>3, no_show>2, repeated objection)
- 3: Escalated too early or too late but customer not harmed
- 1: Should have escalated but didn't; customer left without next step
- 0: Customer abandoned with no disposition or callback

### 6. CUSTOMER_EXPERIENCE
Empathy, clarity, pace?
- 5: Calm, one-question-at-a-time, acknowledged frustration
- 3: Functional but robotic or rushed
- 1: Interrupting, dismissive, or salesy
- 0: Hostile or confusing

## OUTPUT FORMAT (JSON)
{
  "stage_alignment": <0-5>,
  "data_discipline": <0-5>,
  "objection_handling": <0-5 or "N/A">,
  "compliance": <0-5>,
  "containment_decision": <0-5>,
  "customer_experience": <0-5>,
  "overall_score": <average of scored dimensions>,
  "pass": <true if overall >= 4.0 and compliance >= 4>,
  "failure_reasons": [<string>],
  "recommended_actions": [<prompt fix | workflow fix | escalation rule change>],
  "disposition_correct": <true/false>,
  "stage_advanced": <true/false/unknown>
}
```

---

## Operational metrics (dashboard layer)

These are **not** LLM-judged — computed from CRM + call logs. Defined for interview fluency.

| Metric | Definition | Why it matters | Target direction |
|--------|------------|----------------|------------------|
| **Stage completion rate** | % of contacted customers who complete the current stage within 7 days of agent touch | Measures if agent + workflow actually moves funnel | ↑ Higher |
| **Containment rate** | % of calls resolved without human handoff | Cost efficiency; agent autonomy | ↑ Higher (but not at expense of CSAT) |
| **Escalation rate** | % of calls routed to Inside Sales | Too high = agent under-powered; too low = customers stuck | Balance (~10–20% onboarding) |
| **Avg time to activation** | Median days from card approval to ACTIVE | North-star business outcome | ↓ Lower |
| **Drop-off recovery rate** | % of stalled customers re-engaged who complete next stage | Core value prop for this use case | ↑ Higher |
| **CSAT** | Post-call satisfaction (1–5) | Experience quality signal | ↑ Higher |
| **Objection resolution rate** | % of calls with objection where customer continued (did not refuse/hang up) | Prompt + data path quality | ↑ Higher |
| **First-call resolution (FCR)** | Stage objective achieved on first contact | Efficiency metric borrowed from support ops | ↑ Higher |
| **No-show rate (VKYC)** | % of booked VKYC slots missed | Scheduling prompt effectiveness | ↓ Lower |
| **Retry rate** | Avg eKYC/VKYC attempts before success | UX friction indicator | ↓ Lower |
| **Consent violation rate** | Calls made without verified consent | Compliance hard gate | 0% |
| **Hallucination flag rate** | Eval judge flagged invented policy/facts | Prompt discipline | ↓ Lower |
| **Callback SLA adherence** | % of escalations where human called back within promised window | Trust and ops reliability | ↑ Higher |

---

## Weekly iteration loop (Product Ops)

1. Pull eval scores + operational metrics by stage
2. Cluster `failure_reasons` from eval JSON
3. Patch prompt (if data_discipline or objection_handling low)
4. Patch workflow (if containment_decision low)
5. A/B one change per week → measure containment + stage completion
