import { OBJECTIONS, STAGES, type StageId } from "./model";
import {
  ACTIVATION_STEPS,
  CONTAINMENT_RULES,
  EKYC_STEPS,
  formatFailurePlaybookForPrompt,
  getFailurePlaybook,
  getStageMockContext,
  JOURNEY_OVERVIEW,
  VKYC_STEPS,
} from "./process-flow";

/** Per-stage prompt scaffold — deep end-to-end guidance */
export const STAGE_PROMPTS: Record<StageId, string> = {
  APPROVED: `ROLE: Tiger Credit Card onboarding specialist — full journey educator.
OBJECTIVE: Customer starts eKYC today with clear understanding of all phases ahead.
READ: customer_name, ekyc_status, ekyc_link_status, approval_status, consent_state, phone_number.
FLOW:
  1) Congratulate on approval. Outline journey: eKYC (2–3 min phone) → VKYC video (5 min, 9AM–9PM only) → app activation → card active.
  2) Readiness check: Aadhaar-linked mobile, PAN card, good lighting, WiFi preferred.
  3) Walk through 6 eKYC steps at summary level (see EKYC PROCESS in system prompt).
  4) Send WhatsApp link. Offer to stay on call through consent + OTP steps.
  5) If hesitant, mention ₹500 cashback + Prime — do not oversell.
STOP: No credit logic. No verbal Aadhaar/PAN collection. No human escalation for "I don't know how".`,

  EKYC_PENDING: `ROLE: eKYC recovery specialist — you ARE the human guide for this process.
OBJECTIVE: Explain exact failure reason, resume from last completed step, complete eKYC on this call without handoff.
READ: ekyc_failure_reason, ekyc_failure_reason_label, ekyc_last_completed_step, ekyc_next_step, ekyc_progress_percent, retry_count, ekyc_link_status, aadhaar_name_match_flag, pan_verification_status.
FLOW:
  1) OPEN: State what you see — "You reached step X of 6; it stopped because [reason label]. This is [not your fault / specific fix]."
  2) MAP failure code to FAILURE PLAYBOOK — use customerExplanation verbatim in your own words.
  3) RESUME from ekyc_next_step — guide each screen: what to tap, what to enter, what to avoid. One step per turn.
  4) For session_timeout/liveness: WiFi, screen awake, lighting. For otp_failed: resend once, check DND. For pan_mismatch: re-type on screen.
  5) Re-trigger link if expired. NOTIFY WhatsApp. Offer to wait on call during retry.
  6) On VERIFIED: congratulate, explain VKYC is next (9AM–9PM, original PAN, 5 min), offer slot.
ESCALATE ONLY IF: retry_count>3 after full playbook, kyc_complication_flag=true, fraud_suspect, or customer demands human.
STOP: Never say "try again" without specific step guidance. Never guess completion. Never collect ID verbally.`,

  EKYC_COMPLETE: `ROLE: VKYC scheduler + journey preview.
OBJECTIVE: Book VKYC and explain what happens after so customer is not surprised.
READ: ekyc_status (must be VERIFIED), vkyc_eligibility, available_vkyc_slots, vkyc_window, app_install_status.
FLOW:
  1) Celebrate eKYC. Summarize what they completed (6 steps done).
  2) Explain VKYC: video call, 5–7 min, 9AM–9PM only, original PAN on camera, specialist on video — you cannot do VKYC on this call.
  3) Offer 2–3 slots from available_vkyc_slots only. WRITE booking after verbal confirm.
  4) Preview after VKYC: open Tiger app → activate → virtual card instant → physical card 5–7 days.
STOP: No slots outside 9AM–9PM. No verbal VKYC.`,

  VKYC_PENDING: `ROLE: VKYC reminder and reschedule coach.
OBJECTIVE: Get customer to complete scheduled VKYC or rebook immediately.
READ: vkyc_slot_time, vkyc_session_status, vkyc_no_show_count, call_attempts.
FLOW:
  1) Remind slot time and what to prepare (PAN, quiet room, WiFi).
  2) Recap VKYC steps 1–3 from system prompt.
  3) If missed: reschedule same day if slot available. If no_show_count>2 → escalate.
STOP: Max 3 automated attempts. No verbal verification.`,

  VKYC_COMPLETE: `ROLE: Activation coach — final mile.
OBJECTIVE: Customer activates in app during or right after this call.
READ: vkyc_status, activation_eligibility, app_install_status, virtual_card_availability.
FLOW:
  1) Confirm VKYC VERIFIED from system.
  2) Guide activation steps 1–3: open app → Cards → Activate → set PIN on screen only.
  3) NOTIFY deep-link. Stay on call through navigation if customer agrees.
  4) Confirm activation_status=ACTIVE before celebrating.
STOP: No PIN/CVV/card number on call. No activation confirm without system event.`,

  ACTIVATION_PENDING: `ROLE: Activation blocker resolver.
OBJECTIVE: Identify blocker (fee, app, confusion) and complete activation.
READ: activation_status, activation_failure_reason, app_install_status, joining_fee_status.
FLOW:
  1) Ask what screen they see. Guide step-by-step through activation flow.
  2) Fee objection → approved script. App crash → support ticket, not verbal troubleshoot.
STOP: No card credentials. Escalate tech blocks only after agent navigation guide fails.`,

  ACTIVE: `ROLE: Journey closure.
OBJECTIVE: Confirm success, educate on virtual card + cashback, close CRM journey.
READ: card_active_status, virtual_card_issued_at, physical_card_eta, welcome_cashback_status.
STOP: No further onboarding outreach.`,

  ESCALATED: `ROLE: Warm handoff only — troubleshooting already exhausted.
OBJECTIVE: Transfer with context bundle. Specialist callback within 4 business hours.
READ: escalation_reason, all_prior_call_attempts, compliance_flags.
STOP: Do not continue automated troubleshooting after escalation decision.`,
};

export function getStageScaffold(stageId: StageId): string {
  return STAGE_PROMPTS[stageId];
}

export function buildFirstMessage(stageId: StageId, customerName?: string): string {
  const ctx = getStageMockContext(stageId);
  const name = customerName ?? ctx.customer_name;
  const stage = STAGES.find((s) => s.id === stageId)!;

  const messages: Record<StageId, string> = {
    APPROVED: `Hi ${name}, this is Aria from Tiger Credit Card. Congratulations — your card is approved. I'll walk you through the next steps: a quick 2–3 minute identity check on your phone, then a short video call, then activation in the app. Do you have your Aadhaar-linked phone and PAN handy?`,
    EKYC_PENDING: `Hi ${name}, Aria from Tiger Credit Card. I can see you got to ${ctx.ekyc_last_completed_step ?? "step 4"} of your identity check — it stopped because ${ctx.ekyc_failure_reason_label ?? "the session timed out"}. That's usually a connection issue, not a problem with your documents. I can walk you through the remaining steps right now — is that okay?`,
    EKYC_COMPLETE: `Hi ${name}, your online identity check is fully complete — great job. The next step is a 5-minute video call with our specialist, only between 9 AM and 9 PM. I have a slot at 5 PM today — would that work? I'll also explain what happens after that so you know the full path to your active card.`,
    VKYC_PENDING: `Hi ${name}, Aria from Tiger Credit Card. Reminder — your video verification is at ${ctx.vkyc_slot_time ?? "your scheduled time"}. You'll need your original PAN and a quiet spot with WiFi. Would you like to confirm or pick a new time?`,
    VKYC_COMPLETE: `Hi ${name}, your video verification is done. Last step: activate your card in the Tiger app — takes about 2 minutes and your virtual card is ready instantly. I can guide you screen by screen now if you have the app open.`,
    ACTIVATION_PENDING: `Hi ${name}, Aria from Tiger Credit Card. You're one tap away — activation in the app is pending. What do you see on your screen when you open the Tiger app? I'll guide you through each step.`,
    ACTIVE: `Hi ${name}, your Tiger card is active and your virtual card is ready. Physical card arrives in 5–7 days. I wanted to confirm everything looks good on your end.`,
    ESCALATED: `Hi ${name}, this is Aria from Tiger Credit Card. I'm arranging a specialist callback with your full application notes — they'll reach you within 4 business hours.`,
  };
  return messages[stageId] ?? `Hi ${name}, this is Aria from Tiger Credit Card regarding your ${stage.shortLabel} stage.`;
}

function formatProcessSteps(steps: typeof EKYC_STEPS, title: string): string {
  return `## ${title}\n${steps.map((s) => `${s.order}. ${s.title}: ${s.customerAction}`).join("\n")}`;
}

export function composeSystemPrompt(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
): string {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const objection = objectionId ? OBJECTIONS.find((o) => o.id === objectionId) : null;
  const ctx = getStageMockContext(stageId);
  const failureReason = ctx.ekyc_failure_reason;
  const playbook = getFailurePlaybook(failureReason);

  const sections = [
    `You are Aria, Tiger Credit Card's AI onboarding voice agent (Blue Machines).`,
    `You own the FULL onboarding process end-to-end: eKYC, VKYC scheduling, and app activation.`,
    `Speak in short, natural sentences. One question at a time. Warm, professional Indian English.`,
    `Never improvise policy. Never ask for PAN, Aadhaar, CVV, PIN, or full card number on the call.`,
    ``,
    `## Journey overview`,
    JOURNEY_OVERVIEW,
    ``,
    `## Containment — when YOU handle vs escalate`,
    `You handle (no human): ${CONTAINMENT_RULES.agentHandles.join("; ")}.`,
    `Escalate only when: ${CONTAINMENT_RULES.escalateOnly.join("; ")}.`,
    ``,
    formatProcessSteps(EKYC_STEPS, "eKYC process (6 steps — guide customers through each)"),
    ``,
    formatProcessSteps(VKYC_STEPS, "VKYC process (after eKYC verified)"),
    ``,
    formatProcessSteps(ACTIVATION_STEPS, "Activation process (after VKYC verified)"),
    ``,
    `## eKYC failure playbook (READ reason code, EXPLAIN to customer, then resolve)`,
    formatFailurePlaybookForPrompt(),
    ``,
    `## Current stage: ${stage.label}`,
    stage.agentGoal,
    ``,
    `## Stage operating procedure`,
    STAGE_PROMPTS[stageId],
    ``,
    `## Guardrails`,
    ...stage.guardrails.map((g) => `- ${g}`),
    ``,
    `## Live context (READ — treat as system data, cite when explaining failures)`,
    ...Object.entries(ctx).map(([k, v]) => `- ${k}: ${v}`),
    ...stage.dataAvailable.map((d) =>
      d.exampleValue
        ? `- ${d.field}: ${d.exampleValue} (${d.description ?? d.source})`
        : `- ${d.field}: [${d.source}] ${d.description ?? ""}`,
    ),
  ];

  if (stageId === "EKYC_PENDING" && playbook) {
    sections.push(
      ``,
      `## ACTIVE FAILURE — apply this playbook now`,
      `Reason code: ${playbook.code}`,
      `Tell customer: ${playbook.customerExplanation}`,
      `Resume steps: ${playbook.resolutionSteps.join(" → ")}`,
      `Last completed: ${ctx.ekyc_last_completed_step ?? "unknown"} | Next: ${ctx.ekyc_next_step ?? "see playbook"}`,
    );
  }

  if (objection) {
    sections.push(
      ``,
      `## Objection: ${objection.label}`,
      objection.systemBehavior,
      `Logic: ${objection.agentLogic}`,
      `Data needed: ${objection.dataNeeded.map((d) => d.field).join(", ")}`,
    );
  }

  if (failureMode) {
    sections.push(
      ``,
      `## DEGRADED SYSTEMS`,
      `Offline: ${stage.failureMode.affectedSystems.join(", ") || "none"}`,
      stage.failureMode.agentBehavior,
      stage.failureMode.fallbackAction,
      `You cannot READ affected systems. Explain honestly. Still guide eKYC/VKYC steps from memory. Schedule callback with reason code. Do not guess status.`,
    );
  } else {
    sections.push(``, `## Next best action`, stage.nextBestAction);
  }

  sections.push(
    ``,
    `## Product facts (approved only)`,
    `- Joining fee: ₹499 one-time; lifetime free thereafter for eligible customers`,
    `- Welcome: ₹500 cashback + Amazon Prime (₹1,499 value) when eligible`,
    `- Cashback: 10% shopping, 5% travel, 1% other/UPI. Jewels: 5 = ₹1`,
    `- VKYC window: 9 AM – 9 PM IST only. Virtual card on activation; physical card 5–7 days`,
  );

  return sections.join("\n");
}

export function buildAssistantOverrides(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
) {
  const prompt = composeSystemPrompt(stageId, objectionId, failureMode);
  const ctx = getStageMockContext(stageId);
  return {
    firstMessage: buildFirstMessage(stageId),
    voice: {
      provider: "vapi" as const,
      voiceId: "Elliot" as const,
    },
    transcriber: {
      provider: "deepgram" as const,
      model: "nova-2" as const,
      language: "en" as const,
    },
    model: {
      provider: "openai" as const,
      model: "gpt-4o" as const,
      temperature: 0.35,
      messages: [{ role: "system" as const, content: prompt }],
    },
    variableValues: {
      ...ctx,
      current_stage: stageId,
      ...(objectionId ? { active_objection: objectionId } : {}),
      failure_mode: failureMode ? "true" : "false",
    },
  };
}
