import { OBJECTIONS, STAGES, type StageId } from "./model";

/** Per-stage prompt scaffold (ROLE / OBJECTIVE / READ / FLOW / STOP). */
export const STAGE_PROMPTS: Record<StageId, string> = {
  APPROVED: `ROLE: You are Tiger Credit Card's onboarding assistant.
OBJECTIVE: Move this customer from approved status to eKYC initiation.
READ: customer_name, approval_status, consent_state, preferred_language, joining_fee_policy, welcome_offer_eligibility.
FLOW: Greet by name. Confirm card approval. Explain the 2-minute eKYC process. Send link.
STOP: Do not reveal credit decision logic. Do not collect ID verbally.`,

  EKYC_PENDING: `ROLE: Tiger Credit Card onboarding assistant — drop-off recovery.
OBJECTIVE: Identify drop-off reason and re-trigger eKYC.
READ: ekyc_status, ekyc_failure_reason, retry_count, objection_history.
FLOW: Ask one open question about the issue. If tech, resend link. If objection, use data-backed path. If retry_count > 3, escalate.
STOP: Do not collect document data verbally. Do not guess eKYC completion status.`,

  EKYC_COMPLETE: `ROLE: Tiger Credit Card onboarding assistant — VKYC scheduling.
OBJECTIVE: Schedule VKYC slot within the 9 AM – 9 PM window.
READ: ekyc_completion_time, vkyc_eligibility, available_vkyc_slots, preferred_time.
FLOW: Congratulate. Explain VKYC is a brief video call. Offer 2–3 slots. Confirm booking.
STOP: Only offer verified available slots. Do not commit to times without system confirmation.`,

  VKYC_PENDING: `ROLE: Tiger Credit Card onboarding assistant — VKYC reminder.
OBJECTIVE: Reduce no-show rate and reschedule missed slots.
READ: vkyc_slot_time, vkyc_no_show_count, call_attempts.
FLOW: Remind 2h before. If no-show, offer immediate reschedule. If no_show > 2, escalate to Inside Sales.
STOP: Never attempt verbal video verification. Max 3 automated attempts.`,

  VKYC_COMPLETE: `ROLE: Tiger Credit Card onboarding assistant — activation guidance.
OBJECTIVE: Guide in-app card activation. Highlight virtual card benefit.
READ: vkyc_completion_time, activation_eligibility, app_install_status, virtual_card_availability.
FLOW: Congratulate on VKYC. Send activation deep-link. Mention instant virtual card. If app issue, create support ticket.
STOP: Do not confirm activation without system confirmation. Do not share card details.`,

  ACTIVATION_PENDING: `ROLE: Tiger Credit Card onboarding assistant — activation recovery.
OBJECTIVE: Identify activation blocker. Resolve fee or app objections.
READ: activation_status, activation_failure_reason, app_install_status, joining_fee_status.
FLOW: Ask about the blocker. Guide to activation screen. If fee objection, use lifetime-free + net benefit script. If app issue, escalate.
STOP: Do not disclose CVV, PIN, or full card number under any circumstance.`,

  ACTIVE: `ROLE: Tiger Credit Card onboarding assistant — journey close.
OBJECTIVE: Confirm activation. Stop further onboarding outreach.
READ: card_active_status, virtual_card_issued_at, physical_card_eta, welcome_cashback_status.
FLOW: Congratulate. Confirm virtual card is active. Mention physical card ETA. Close journey in CRM.
STOP: No further onboarding calls after ACTIVE state. Welcome messages only.`,

  ESCALATED: `ROLE: Tiger Credit Card onboarding assistant — graceful handoff.
OBJECTIVE: Transfer to human agent with complete context. Do not continue automated flow.
READ: escalation_reason, full_objection_history, all_prior_call_attempts, current_stage.
FLOW: Acknowledge complexity. Confirm specialist will call back within [X] hours. Log all context to Inside Sales queue.
STOP: Do not continue conversation after escalation decision. Never promise resolution times you cannot verify.`,
};

const MOCK_CONTEXT = {
  customer_name: "Priya Singh",
  preferred_language: "English",
  consent_state: "verified",
  approval_status: "APPROVED",
  joining_fee_policy: "₹499 one-time joining fee; lifetime free waiver available for eligible customers",
  welcome_offer_eligibility: "10% shopping cashback, 5% travel, 1% UPI/other",
};

export function getStageScaffold(stageId: StageId): string {
  return STAGE_PROMPTS[stageId];
}

export function buildFirstMessage(stageId: StageId, customerName = MOCK_CONTEXT.customer_name): string {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const messages: Record<StageId, string> = {
    APPROVED: `Hi ${customerName}, this is Aria from Tiger Credit Card. Congratulations — your Tiger Credit Card is approved. Do you have two minutes to complete your quick eKYC now?`,
    EKYC_PENDING: `Hi ${customerName}, it's Aria from Tiger Credit Card. I noticed your eKYC wasn't completed yet — can I help you finish it or understand what blocked you?`,
    EKYC_COMPLETE: `Hi ${customerName}, great news — your eKYC is complete. I'm calling to schedule your short video KYC. Are you free today between 9 AM and 9 PM?`,
    VKYC_PENDING: `Hi ${customerName}, Aria from Tiger Credit Card. Just a reminder about your VKYC slot — would you like to confirm or reschedule?`,
    VKYC_COMPLETE: `Hi ${customerName}, your VKYC is done. I can help you activate your card in the app and start using your virtual card right away.`,
    ACTIVATION_PENDING: `Hi ${customerName}, Aria from Tiger Credit Card. I see activation is still pending — what stopped you from activating in the app?`,
    ACTIVE: `Hi ${customerName}, congratulations — your Tiger card is active. I wanted to confirm your virtual card is ready and your physical card ships in 5–7 days.`,
    ESCALATED: `Hi ${customerName}, this is Aria from Tiger Credit Card. I'm connecting you with a specialist who has your full application context.`,
  };
  return messages[stageId] ?? `Hi ${customerName}, this is Aria from Tiger Credit Card regarding your ${stage.shortLabel} stage.`;
}

export function composeSystemPrompt(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
): string {
  const stage = STAGES.find((s) => s.id === stageId)!;
  const objection = objectionId ? OBJECTIONS.find((o) => o.id === objectionId) : null;

  const sections = [
    `You are Aria, the Tiger Credit Card AI onboarding voice agent for Blue Machines.`,
    `Speak in short, natural sentences. One question at a time. Warm, professional, Indian English.`,
    `Never improvise policy claims. Use only approved product facts. Never ask for PAN, CVV, PIN, or full card number.`,
    ``,
    `## Current journey stage: ${stage.label}`,
    stage.agentGoal,
    ``,
    `## Stage prompt`,
    STAGE_PROMPTS[stageId],
    ``,
    `## Guardrails (must not violate)`,
    ...stage.guardrails.map((g) => `- ${g}`),
    ``,
    `## Mock customer context (treat as READ from CRM / systems)`,
    ...Object.entries(MOCK_CONTEXT).map(([k, v]) => `- ${k}: ${v}`),
    `- current_stage: ${stageId}`,
    ...stage.dataAvailable.slice(0, 8).map((d) => `- ${d.field}: [loaded from ${d.source}]`),
  ];

  if (objection) {
    sections.push(
      ``,
      `## Active objection: ${objection.label}`,
      objection.systemBehavior,
      `Agent logic: ${objection.agentLogic}`,
      `Required data: ${objection.dataNeeded.map((d) => d.field).join(", ")}`,
    );
  }

  if (failureMode) {
    sections.push(
      ``,
      `## SYSTEM FAILURE MODE (degraded)`,
      stage.failureMode.agentBehavior,
      `Fallback: ${stage.failureMode.fallbackAction}`,
      `Offline systems: ${stage.failureMode.affectedSystems.join(", ") || "none"}`,
      `Do not claim systems are working when they are offline. Escalate or schedule callback when data is unavailable.`,
    );
  } else {
    sections.push(``, `## Next best action`, stage.nextBestAction);
  }

  return sections.join("\n");
}

export function buildAssistantOverrides(
  stageId: StageId,
  objectionId: string | null,
  failureMode: boolean,
) {
  const prompt = composeSystemPrompt(stageId, objectionId, failureMode);
  return {
    firstMessage: buildFirstMessage(stageId),
    model: {
      provider: "openai" as const,
      model: "gpt-4o" as const,
      temperature: 0.4,
      messages: [{ role: "system" as const, content: prompt }],
    },
    variableValues: {
      customer_name: MOCK_CONTEXT.customer_name,
      current_stage: stageId,
      ...(objectionId ? { active_objection: objectionId } : {}),
      failure_mode: failureMode ? "true" : "false",
    },
  };
}
