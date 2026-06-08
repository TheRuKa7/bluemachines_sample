/**
 * process-flow.ts — End-to-end onboarding process knowledge for the voice agent.
 *
 * Single reference for eKYC/VKYC/activation steps, failure playbooks, and
 * containment rules. Consumed by vapi-prompt.ts and AgentPanel.
 */
import type { StageId } from "./model";

export interface ProcessStep {
  order: number;
  title: string;
  customerAction: string;
  documentsNeeded?: string;
  commonMistakes?: string;
  agentTip: string;
}

export interface FailurePlaybook {
  code: string;
  label: string;
  /** Plain-language explanation the agent gives the customer */
  customerExplanation: string;
  rootCause: string;
  /** Ordered steps the agent walks through on the call */
  resolutionSteps: string[];
  /** Fields the agent should READ before explaining */
  dataFields: string[];
  escalateWhen: string;
}

export const JOURNEY_OVERVIEW = `Tiger Credit Card onboarding has four phases after approval:
1) eKYC — self-serve on phone (2–3 min): Aadhaar OTP + selfie + PAN verification. Available 24/7.
2) VKYC — live video call with a specialist (5–7 min): only between 9 AM–9 PM. Original PAN visible on camera.
3) In-app activation — set PIN and confirm in Tiger app. Instant virtual card issued.
4) Active — physical card ships in 5–7 days; welcome cashback and Prime benefits apply per eligibility.

The agent owns the full journey end-to-end. Human handoff is ONLY for: compliance flags, policy disputes, repeated system failures after agent exhausted playbook, customer explicitly requests human, or issues unrelated to onboarding (billing disputes, fraud). Confusion about eKYC steps is NOT an escalation — guide step-by-step.`;

export const EKYC_STEPS: ProcessStep[] = [
  {
    order: 1,
    title: "Open secure link",
    customerAction: "Tap the WhatsApp/SMS link from Tiger. Opens in mobile browser — do not use desktop.",
    agentTip: "Confirm link received. If expired, re-trigger from eKYC system before guiding further.",
  },
  {
    order: 2,
    title: "Consent & mobile verification",
    customerAction: "Accept terms. Enter registered mobile number. OTP arrives via SMS — enter within 3 minutes.",
    documentsNeeded: "Phone with active SIM matching application number",
    commonMistakes: "Wrong number entered; OTP expired; DND blocking SMS",
    agentTip: "If otp_failed: ask them to check SMS spam, disable DND briefly, or request OTP resend once.",
  },
  {
    order: 3,
    title: "Aadhaar verification",
    customerAction: "Choose Aadhaar path. Enter last 4 digits or full Aadhaar per screen prompt. Complete Aadhaar OTP on UIDAI page.",
    documentsNeeded: "Aadhaar linked to application mobile",
    commonMistakes: "Aadhaar mobile mismatch; OTP timeout on UIDAI page",
    agentTip: "Never ask customer to read full Aadhaar aloud. If aadhaar_mismatch, confirm they use the Aadhaar tied to their application phone.",
  },
  {
    order: 4,
    title: "Selfie / liveness check",
    customerAction: "Allow camera permission. Face the camera in good lighting. Hold still until green checkmark. Keep screen awake.",
    documentsNeeded: "Front camera, stable WiFi recommended",
    commonMistakes: "Dark room; face partially covered; screen sleep mid-capture; mobile data dropout",
    agentTip: "For session_timeout or liveness_failed: WiFi, brightness up, remove glasses/hat if glare, retry in one sitting.",
  },
  {
    order: 5,
    title: "PAN verification",
    customerAction: "Enter PAN as on card. Confirm name spelling matches Aadhaar. Submit.",
    documentsNeeded: "Physical or digital PAN card",
    commonMistakes: "Typo in PAN; name mismatch between PAN and Aadhaar",
    agentTip: "For pan_mismatch: ask customer to verify spelling character-by-character on screen, not verbally to agent.",
  },
  {
    order: 6,
    title: "Review & submit",
    customerAction: "Review summary screen. Tap Submit. Wait for success confirmation — do not close browser until 'eKYC complete' appears.",
    commonMistakes: "Closing browser before confirmation; back button after submit",
    agentTip: "On success, READ ekyc_status=VERIFIED. Immediately explain VKYC is next and offer slot today/tomorrow 9AM–9PM.",
  },
];

export const VKYC_STEPS: ProcessStep[] = [
  {
    order: 1,
    title: "Join scheduled call",
    customerAction: "At booked slot, open VKYC link from SMS/WhatsApp. Join video room. Stable WiFi, quiet room.",
    agentTip: "Remind: original PAN in hand, not photocopy. Call only works 9 AM–9 PM IST.",
  },
  {
    order: 2,
    title: "Identity verification on video",
    customerAction: "Show PAN to camera when asked. Answer name, DOB, address confirmation. Follow agent instructions on screen.",
    documentsNeeded: "Original PAN card",
    agentTip: "Agent cannot perform VKYC — only schedule, remind, reschedule. If customer asks what happens, describe 5–7 min specialist call.",
  },
  {
    order: 3,
    title: "Completion",
    customerAction: "Wait for on-screen VKYC approved message.",
    agentTip: "After VERIFIED, guide to app activation same call if customer has time; else send activation deep-link.",
  },
];

export const ACTIVATION_STEPS: ProcessStep[] = [
  {
    order: 1,
    title: "Install / open Tiger app",
    customerAction: "Download Tiger app from Play Store or App Store if not installed. Log in with registered mobile OTP.",
    agentTip: "READ app_install_status. Send store link via NOTIFY if missing.",
  },
  {
    order: 2,
    title: "Card activation screen",
    customerAction: "Home → Cards → Activate. Accept terms. Set 4-digit card PIN (not UPI PIN).",
    agentTip: "Never ask for PIN on voice call. Guide navigation only.",
  },
  {
    order: 3,
    title: "Virtual card ready",
    customerAction: "Confirm activation success in app. Virtual card visible immediately for online use.",
    agentTip: "Confirm activation_status=ACTIVE from system before congratulating. Mention physical card ETA 5–7 days.",
  },
];

export const EKYC_FAILURE_PLAYBOOK: Record<string, FailurePlaybook> = {
  session_timeout: {
    code: "session_timeout",
    label: "Session timed out",
    customerExplanation:
      "Your verification session timed out — usually due to slow internet or the screen locking during the selfie step. Your documents are fine; nothing was rejected.",
    rootCause: "Network instability or app/browser backgrounded during liveness capture",
    resolutionSteps: [
      "Explain this is technical, not a document rejection",
      "Ask customer to switch to WiFi and disable battery saver for the browser",
      "Re-trigger fresh eKYC link via WRITE to eKYC system",
      "Walk through steps 4–6: selfie in good light, keep screen awake, wait for success screen",
      "Offer to stay on call while they retry",
    ],
    dataFields: ["ekyc_failure_reason", "ekyc_last_completed_step", "retry_count", "last_attempted_at"],
    escalateWhen: "retry_count > 3 after following full playbook, or customer cannot receive links",
  },
  otp_failed: {
    code: "otp_failed",
    label: "OTP not received or invalid",
    customerExplanation:
      "The one-time password didn't come through or expired. This is common with DND or network delays on SMS.",
    rootCause: "SMS delivery failure, wrong mobile entered, or OTP expired (>3 min)",
    resolutionSteps: [
      "Confirm they're using the mobile number on the application",
      "Ask to check SMS inbox and spam; temporarily disable DND if enabled",
      "Guide to tap 'Resend OTP' once on the eKYC screen",
      "If still failing after 2 resends, re-trigger full link",
    ],
    dataFields: ["ekyc_failure_reason", "ekyc_last_completed_step", "phone_number", "retry_count"],
    escalateWhen: "Mobile number mismatch with application — compliance review required",
  },
  aadhaar_mismatch: {
    code: "aadhaar_mismatch",
    label: "Aadhaar details mismatch",
    customerExplanation:
      "The Aadhaar details didn't match what we have on file. This usually means a different Aadhaar was used or the name spelling differs slightly.",
    rootCause: "Aadhaar not linked to application mobile, or demographic mismatch",
    resolutionSteps: [
      "Ask customer to use the Aadhaar linked to their application phone number",
      "Guide them to re-enter on screen — do not collect Aadhaar verbally",
      "If mismatch persists twice, READ name_on_application vs aadhaar_name_match_flag",
      "Only escalate if compliance flag set — not for first-time confusion",
    ],
    dataFields: ["aadhaar_name_match_flag", "name_on_application", "ekyc_last_completed_step"],
    escalateWhen: "aadhaar_name_match_flag=false after 2 guided attempts, or fraud_suspect flag",
  },
  liveness_failed: {
    code: "liveness_failed",
    label: "Selfie / liveness check failed",
    customerExplanation:
      "The selfie step didn't pass — often lighting, camera permission, or movement during capture. Not a rejection of your identity.",
    rootCause: "Poor lighting, face obstruction, camera denied, or multiple faces in frame",
    resolutionSteps: [
      "Confirm camera permission allowed for browser",
      "Face window with even light; remove cap/sunglasses",
      "Hold still 3–5 seconds until checkmark",
      "Retry step 4 only — no need to restart from step 1 if link still active",
    ],
    dataFields: ["ekyc_failure_reason", "ekyc_last_completed_step", "retry_count"],
    escalateWhen: "3+ liveness failures after coaching — offer scheduled callback, not immediate human KYC unless flag set",
  },
  pan_mismatch: {
    code: "pan_mismatch",
    label: "PAN verification failed",
    customerExplanation:
      "The PAN entered didn't match our records. Often a small typing error or using a different PAN.",
    rootCause: "Typo, wrong PAN card, or name mismatch between PAN and Aadhaar",
    resolutionSteps: [
      "Ask customer to re-enter PAN carefully on screen character by character",
      "Confirm name on PAN matches Aadhaar name spelling",
      "Do not ask customer to read PAN aloud on this call",
      "If second attempt fails, re-trigger link for fresh session",
    ],
    dataFields: ["pan_verification_status", "name_on_application", "ekyc_last_completed_step"],
    escalateWhen: "pan_verification_status=failed twice with same customer-confirmed PAN — compliance ticket",
  },
  link_expired: {
    code: "link_expired",
    label: "eKYC link expired",
    customerExplanation: "The previous link expired after 48 hours. I'll send a fresh one now — takes the same 2–3 minutes.",
    rootCause: "ekyc_link_expiry passed without completion",
    resolutionSteps: [
      "WRITE re-trigger eKYC link",
      "NOTIFY via WhatsApp/SMS",
      "Briefly recap all 6 eKYC steps since customer may be starting fresh",
    ],
    dataFields: ["ekyc_link_expiry", "ekyc_link_status", "retry_count"],
    escalateWhen: "Customer cannot receive notifications after 2 NOTIFY attempts",
  },
  not_started: {
    code: "not_started",
    label: "eKYC never started",
    customerExplanation: "You haven't started eKYC yet — I'll send the link and walk you through each step now.",
    rootCause: "Customer approved but ekyc_status=NOT_INITIATED",
    resolutionSteps: [
      "Explain full journey: eKYC now → VKYC video call (9AM–9PM) → app activation",
      "List documents: Aadhaar-linked phone, PAN, good lighting",
      "Send link and offer to guide step-by-step on the call",
      "Start from EKYC step 1",
    ],
    dataFields: ["ekyc_status", "ekyc_link_status", "approval_timestamp"],
    escalateWhen: "Customer refuses eKYC after education — log disposition, not escalation",
  },
};

/** When the agent must hand off vs must self-resolve */
export const CONTAINMENT_RULES = {
  agentHandles: [
    "Customer does not understand eKYC, VKYC, or activation steps",
    "Any failure reason in EKYC_FAILURE_PLAYBOOK (guide using resolutionSteps)",
    "Technical retries: session timeout, OTP, liveness, expired link",
    "Product objections: fee, jewels, limit, ad copy (using approved scripts)",
    "Scheduling VKYC and sending reminders",
    "Walking through app activation navigation",
  ],
  escalateOnly: [
    "compliance_flag or fraud_suspect set",
    "aadhaar_name_match_flag=false after 2 coached attempts",
    "Policy/ad offer discrepancy requiring compliance adjudication",
    "retry_count > 3 on eKYC after full playbook exhausted",
    "vkyc_no_show_count > 2",
    "Customer explicitly demands human agent",
    "Issue unrelated to onboarding (transactions, disputes, lost card)",
    "System failure mode: cannot READ status after callback scheduled",
  ],
};

export interface StageMockContext {
  [key: string]: string;
}

const BASE_MOCK: StageMockContext = {
  customer_name: "Priya Singh",
  phone_number: "+91 98201 44192",
  preferred_language: "English",
  consent_state: "verified",
  approval_status: "APPROVED",
  approval_timestamp: "2024-11-12T09:15:00+05:30",
  joining_fee_policy: "₹499 one-time joining fee; lifetime free thereafter",
  welcome_offer_eligibility: "₹500 cashback + 1-year Amazon Prime (₹1,499 value)",
};

const STAGE_MOCK: Partial<Record<StageId, StageMockContext>> = {
  APPROVED: {
    ekyc_status: "NOT_INITIATED",
    ekyc_link_status: "not_sent",
    prior_call_attempts: "0",
  },
  EKYC_PENDING: {
    ekyc_status: "PENDING",
    ekyc_failure_reason: "session_timeout",
    ekyc_failure_reason_label: "Session timed out during selfie step",
    ekyc_last_completed_step: "4 — Selfie / liveness check",
    ekyc_next_step: "5 — PAN verification",
    ekyc_progress_percent: "67",
    retry_count: "2",
    last_attempted_at: "2024-11-15T15:42:00+05:30",
    ekyc_link_status: "active",
    ekyc_link_expiry: "2024-11-17T15:42:00+05:30",
    kyc_complication_flag: "false",
    aadhaar_name_match_flag: "true",
    pan_verification_status: "not_attempted",
    name_on_application: "Priya Singh",
    objection_history: "[]",
    prior_call_attempts: "1",
  },
  EKYC_COMPLETE: {
    ekyc_status: "VERIFIED",
    ekyc_completion_time: "2024-11-16T10:23:00+05:30",
    vkyc_status: "NOT_SCHEDULED",
    vkyc_eligibility: "true",
    available_vkyc_slots: "Today 5:00 PM, Tomorrow 9:00 AM, Tomorrow 2:00 PM",
    vkyc_window: "09:00–21:00 IST",
    app_install_status: "installed",
  },
  VKYC_PENDING: {
    vkyc_status: "SCHEDULED",
    vkyc_slot_time: "Today 5:00 PM IST",
    vkyc_session_status: "pending",
    vkyc_no_show_count: "0",
    call_attempts: "1",
  },
  VKYC_COMPLETE: {
    vkyc_status: "VERIFIED",
    vkyc_completion_time: "2024-11-16T17:05:00+05:30",
    activation_status: "PENDING",
    activation_eligibility: "true",
    app_install_status: "installed",
    virtual_card_availability: "ready_on_activation",
  },
  ACTIVATION_PENDING: {
    activation_status: "PENDING",
    activation_failure_reason: "not_started",
    virtual_card_status: "pending_activation",
    app_install_status: "installed",
    call_attempts: "2",
  },
  ACTIVE: {
    activation_status: "ACTIVE",
    card_active_status: "true",
    virtual_card_issued_at: "2024-11-17T11:00:00+05:30",
    physical_card_eta: "5–7 business days",
    welcome_cashback_status: "eligible_pending_first_txn",
  },
  ESCALATED: {
    escalation_reason: "ekyc_retry_exhausted",
    current_stage: "EKYC_PENDING",
    all_prior_call_attempts: "4",
    compliance_flags: "none",
  },
};

export function getStageMockContext(stageId: StageId): StageMockContext {
  return { ...BASE_MOCK, ...STAGE_MOCK[stageId] };
}

export function getFailurePlaybook(reasonCode: string | undefined): FailurePlaybook | null {
  if (!reasonCode) return null;
  return EKYC_FAILURE_PLAYBOOK[reasonCode] ?? null;
}

export function formatEkycStepsForPrompt(): string {
  return EKYC_STEPS.map(
    (s) =>
      `Step ${s.order}: ${s.title} — Customer: ${s.customerAction}${s.documentsNeeded ? ` | Need: ${s.documentsNeeded}` : ""}${s.commonMistakes ? ` | Common issues: ${s.commonMistakes}` : ""} | Agent tip: ${s.agentTip}`,
  ).join("\n");
}

export function formatFailurePlaybookForPrompt(): string {
  return Object.values(EKYC_FAILURE_PLAYBOOK)
    .map(
      (p) =>
        `### ${p.code} (${p.label})
Tell customer: ${p.customerExplanation}
Root cause: ${p.rootCause}
Steps: ${p.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join(" ")}
READ first: ${p.dataFields.join(", ")}
Escalate only when: ${p.escalateWhen}`,
    )
    .join("\n\n");
}
