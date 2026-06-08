/**
 * model.ts — Single source of truth for all prototype data.
 *
 * This file contains every type definition and every data record used across
 * the prototype. No network requests are made anywhere — all data lives here.
 *
 * Structure:
 *   1. Type definitions
 *      - StageId / SystemId / ArrowType       : string-union identifiers
 *      - SystemConnection / DataField          : sub-shapes for stage data
 *      - StageMetrics / StageData              : the full stage record shape
 *      - ObjectionData / SystemNode            : objection + diagram node shapes
 *
 *   2. SYSTEMS array      : the 10 system nodes rendered in the flow diagram SVG,
 *                           with x/y/w/h coordinates matching the SVG viewBox.
 *
 *   3. STAGES array       : one record per journey stage (APPROVED → ESCALATED),
 *                           each with agent logic, data fields, metrics, guardrails,
 *                           and failure-mode configuration.
 *
 *   4. OBJECTIONS array   : the 7 customer objection scenarios with the data fields
 *                           and agent-logic rules needed to resolve each one.
 *
 *   5. STAGE_ORDER        : the canonical display order for stages in the left panel.
 *
 * Adding a new stage: add an entry to STAGES and STAGE_ORDER, and add the new
 * StageId to the StageId union type. The rest of the prototype adapts automatically.
 */

/** Canonical identifier for each stage in the card onboarding journey. */
export type StageId =
  | "APPROVED"
  | "EKYC_PENDING"
  | "EKYC_COMPLETE"
  | "VKYC_PENDING"
  | "VKYC_COMPLETE"
  | "ACTIVATION_PENDING"
  | "ACTIVE"
  | "ESCALATED";

/** Identifier for each system node in the data-flow diagram. */
export type SystemId =
  | "card_core"
  | "crm"
  | "ekyc"
  | "vkyc"
  | "activation"
  | "notification"
  | "inside_sales"
  | "compliance"
  | "analytics"
  | "bm_agent";

/** Direction of data flow on a connection arrow in the system diagram. */
export type ArrowType = "READ" | "WRITE" | "NOTIFY" | "ESCALATE";

/** A single directed data-flow arrow between two system nodes on the diagram. */
export interface SystemConnection {
  from: SystemId;
  to: SystemId;
  type: ArrowType;
  /** Short human-readable label rendered on the arrow (e.g. "eKYC link sent"). */
  label: string;
}

/**
 * A data field the agent can access during a stage.
 * `sensitive` fields are flagged with a PII badge in AgentPanel's Data Available tab
 * and their access is logged to the Compliance / Audit layer.
 */
export interface DataField {
  field: string;
  source: SystemId;
  sensitive?: boolean;
  /** What this field means for agent decisions */
  description?: string;
  /** Illustrative value shown in the prototype inspector */
  exampleValue?: string;
}

/**
 * Six simulated eval metrics per stage.
 * Values are illustrative; AnalyticsBar applies degradation multipliers in failure mode.
 */
export interface StageMetrics {
  stageCompletionRate: number;   // % of customers who complete this stage after agent contact
  containmentRate: number;       // % of calls resolved without human handoff
  escalationRate: number;        // % requiring Inside Sales or manual intervention
  avgTimeToActivation: string;   // Human-readable average (e.g. "1–2 days")
  dropOffRecoveryRate: number;   // % of dropped customers recovered
  csat: number;                  // Customer satisfaction score (out of 5)
}

/**
 * Full data record for a single onboarding journey stage.
 * This is the primary data unit consumed by AgentPanel, SystemFlowDiagram,
 * AnalyticsBar, and the transcript generators.
 */
export interface StageData {
  id: StageId;
  label: string;         // Full display label (e.g. "APPROVED — Card Ready")
  shortLabel: string;    // Compact label for the left sidebar (e.g. "Approved")
  description: string;   // One-sentence description shown under the selected stage
  color: string;         // Hex theme colour used for stage badges, borders, and diagram nodes
  activeSystems: SystemId[];          // Which system nodes are live (highlighted) this stage
  connections: SystemConnection[];    // Which arrows to render animated this stage
  dataAvailable: DataField[];         // All fields the agent can read this stage
  agentGoal: string;                  // Agent's primary objective for this stage
  nextBestAction: string;             // The immediate action the agent should take
  transitionEvent: string;            // System event that moves the customer to the next stage
  guardrails: string[];               // Hard compliance constraints the agent must not breach
  fallback: string;                   // What the agent does when the normal path fails
  metrics: StageMetrics;
  failureMode: {
    /** System IDs that go offline in the failure scenario for this stage. */
    affectedSystems: SystemId[];
    /** What the agent does when affected systems are unavailable. */
    fallbackAction: string;
    /** Description of the agent's degraded behaviour shown in the red banner. */
    agentBehavior: string;
  };
}

/**
 * A single customer objection scenario.
 * Objections are selected via chips in the App footer; the active objection
 * injects additional turns into the transcript and surfaces extra data fields
 * in AgentPanel's Data Available tab.
 */
export interface ObjectionData {
  id: string;           // Must exactly match the key in OBJECTION_TRANSCRIPTS in transcript.ts
  label: string;        // Full display name for AgentPanel headings
  shortLabel: string;   // Short chip label in the App footer strip
  dataNeeded: { field: string; system: SystemId }[];  // Fields required to resolve the objection
  systemBehavior: string;   // What the backend systems do when this objection is raised
  agentLogic: string;       // The decision rules the agent follows to handle the objection
}

/**
 * A single node in the system data-flow diagram.
 * x/y/w/h coordinates are in the SVG viewBox space (600×500) defined in
 * SystemFlowDiagram.tsx — these must remain in sync with the SVG canvas constants.
 */
export interface SystemNode {
  id: SystemId;
  label: string;        // Display label (may contain " / " to split across two lines)
  shortLabel: string;   // Used in system-tag chips and badges throughout the UI
  role: string;         // One-sentence description of the system's purpose
  x: number;            // Left edge of the node rect in SVG viewBox units
  y: number;            // Top edge of the node rect in SVG viewBox units
  w: number;            // Width of the node rect
  h: number;            // Height of the node rect
  group: "source" | "agent" | "output";  // Column the node belongs to in the diagram
}

/* ─────────────────────────────────────────────────────────────────────────────
   SYSTEMS — the 10 nodes rendered on the SVG data-flow diagram.

   Layout: three columns (x ≈ 30, 236, 424) within a 600×500 viewBox.
     source column : Card Core, CRM, eKYC, VKYC, Activation   (x=30)
     agent column  : Blue Machines Agent                        (x=236, wider)
     output column : Notification, Inside Sales, Compliance,
                     Analytics, (BM Agent also spans output)    (x=424)

   Changing x/y/w/h here must be reflected in the SVG layout constants
   (W, H, NODE_W, NODE_H, AGENT_W, AGENT_H) in SystemFlowDiagram.tsx.
   ───────────────────────────────────────────────────────────────────────────── */
export const SYSTEMS: SystemNode[] = [
  /* ── Data Source column (x ≈ 30) ──────────────────────────────────────── */
  { id: "card_core", label: "Card Core / Approval", shortLabel: "Card Core", role: "Source of truth for approval status and card lifecycle", x: 30, y: 50, w: 148, h: 44, group: "source" },
  { id: "crm", label: "CRM / Journey State", shortLabel: "CRM / State", role: "Customer context, history, and journey state store", x: 30, y: 130, w: 148, h: 44, group: "source" },
  { id: "ekyc", label: "eKYC System", shortLabel: "eKYC", role: "Electronic KYC verification status and completion", x: 30, y: 210, w: 148, h: 44, group: "source" },
  { id: "vkyc", label: "VKYC Scheduling", shortLabel: "VKYC", role: "Video KYC scheduling, eligibility and verification", x: 30, y: 290, w: 148, h: 44, group: "source" },
  { id: "activation", label: "Activation System", shortLabel: "Activation", role: "Card activation state and virtual card issuance", x: 30, y: 370, w: 148, h: 44, group: "source" },
  { id: "bm_agent", label: "Blue Machines Agent", shortLabel: "BM Agent", role: "Voice agent orchestration, conversation, workflow execution", x: 236, y: 185, w: 168, h: 60, group: "agent" },
  { id: "notification", label: "Notification Service", shortLabel: "Notifications", role: "SMS / WhatsApp / Push delivery layer", x: 424, y: 50, w: 148, h: 44, group: "output" },
  { id: "inside_sales", label: "Inside Sales Dashboard", shortLabel: "Inside Sales", role: "Human fallback, callbacks, escalation queue", x: 424, y: 130, w: 148, h: 44, group: "output" },
  { id: "compliance", label: "Compliance / Audit", shortLabel: "Compliance", role: "Guardrails, consent, audit trail, restricted disclosures", x: 424, y: 210, w: 148, h: 44, group: "output" },
  { id: "analytics", label: "Analytics / Eval", shortLabel: "Analytics", role: "Call outcomes, metrics, eval loop, prompt tuning signals", x: 424, y: 290, w: 148, h: 44, group: "output" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   STAGES — one StageData record per onboarding journey stage.

   Ordering: APPROVED → EKYC_PENDING → EKYC_COMPLETE → VKYC_PENDING →
             VKYC_COMPLETE → ACTIVATION_PENDING → ACTIVE → ESCALATED

   Each record drives:
     - StageSelector: label, shortLabel, description, color
     - SystemFlowDiagram: activeSystems, connections
     - AgentPanel: agentGoal, nextBestAction, transitionEvent, guardrails,
                   fallback, dataAvailable, failureMode
     - AnalyticsBar: metrics
     - transcript.ts: failureMode.affectedSystems, failureMode.agentBehavior
   ───────────────────────────────────────────────────────────────────────────── */
export const STAGES: StageData[] = [
  {
    id: "APPROVED",
    label: "Card Approved",
    shortLabel: "Approved",
    description: "Card approved, eKYC not yet initiated. Customer is eligible but has not started.",
    color: "#3b82f6",
    activeSystems: ["card_core", "crm", "bm_agent", "notification", "compliance", "analytics"],
    connections: [
      { from: "card_core", to: "bm_agent", type: "READ", label: "approval status, phone, language" },
      { from: "crm", to: "bm_agent", type: "READ", label: "customer profile, consent state" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "call disposition, next-action" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "eKYC link / reminder trigger" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "call audit trail, consent log" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "call outcome, stage metrics" },
    ],
    dataAvailable: [
      { field: "customer_name", source: "crm", description: "Greeting and identity confirmation", exampleValue: "Priya Singh" },
      { field: "phone_number", source: "crm", description: "Registered mobile for OTP and NOTIFY", exampleValue: "+91 98201 44192", sensitive: true },
      { field: "preferred_language", source: "crm", description: "Call language", exampleValue: "English" },
      { field: "approval_status", source: "card_core", description: "Card approved — eligible for eKYC", exampleValue: "APPROVED" },
      { field: "approval_timestamp", source: "card_core", description: "When approval was granted", exampleValue: "2024-11-12" },
      { field: "consent_state", source: "crm", description: "Outbound call permitted", exampleValue: "verified" },
      { field: "ekyc_status", source: "ekyc", description: "Whether eKYC started", exampleValue: "NOT_INITIATED" },
      { field: "ekyc_link_status", source: "ekyc", description: "Deep-link sent or pending", exampleValue: "not_sent" },
      { field: "segment", source: "crm", description: "Customer segment for offer positioning", exampleValue: "premium_retail" },
      { field: "joining_fee_policy", source: "card_core", description: "Approved fee script", exampleValue: "₹499 one-time; LTF eligible" },
      { field: "welcome_offer_eligibility", source: "card_core", description: "Cashback + Prime bundle", exampleValue: "₹500 + Prime ₹1,499" },
    ],
    agentGoal: "Explain the full onboarding path (eKYC → VKYC → activation), set expectations for each phase, and start eKYC with step-by-step readiness check.",
    nextBestAction: "Confirm customer has Aadhaar-linked phone, PAN, and 3 minutes. Explain all 6 eKYC steps at high level. Send link via WhatsApp. Offer to stay on call through step 1–2. Mention VKYC is a separate 5-min video call (9AM–9PM only) after eKYC succeeds.",
    transitionEvent: "eKYC session initiated (event from eKYC system)",
    guardrails: [
      "Do not reveal credit policy internals or approval decision logic",
      "Do not make promises beyond approved product script",
      "Verify consent before outreach; if missing, route to compliant callback",
      "Do not attempt to collect identity data verbally",
    ],
    fallback: "If customer is unreachable or CRM data is stale, write retry task to Inside Sales and close call with disposition.",
    metrics: {
      stageCompletionRate: 68,
      containmentRate: 74,
      escalationRate: 12,
      avgTimeToActivation: "5.2 days",
      dropOffRecoveryRate: 41,
      csat: 3.8,
    },
    failureMode: {
      affectedSystems: ["crm", "card_core"],
      fallbackAction: "Agent asks for minimal verbal confirmation (name + last 4 digits), creates manual review task in Inside Sales",
      agentBehavior: "Apologise for verification delay, offer to call back at a convenient time, log callback reason",
    },
  },
  {
    id: "EKYC_PENDING",
    label: "eKYC Pending",
    shortLabel: "eKYC Pending",
    description: "Customer started eKYC but hasn't completed it. Common drop-off point.",
    color: "#f59e0b",
    activeSystems: ["crm", "ekyc", "bm_agent", "notification", "compliance", "analytics"],
    connections: [
      { from: "crm", to: "bm_agent", type: "READ", label: "journey stage, last contact, objection history" },
      { from: "ekyc", to: "bm_agent", type: "READ", label: "eKYC status, failure reason, retry count" },
      { from: "bm_agent", to: "ekyc", type: "WRITE", label: "re-trigger eKYC link, session update" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "call outcome, disposition" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "eKYC reminder / retry link" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "audit log, action trace" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "drop-off event, reason code" },
    ],
    dataAvailable: [
      { field: "ekyc_status", source: "ekyc", description: "Current eKYC state", exampleValue: "PENDING" },
      { field: "ekyc_failure_reason", source: "ekyc", description: "Machine reason code — map to customer explanation", exampleValue: "session_timeout" },
      { field: "ekyc_failure_reason_label", source: "ekyc", description: "Human-readable failure for agent script", exampleValue: "Session timed out during selfie" },
      { field: "ekyc_last_completed_step", source: "ekyc", description: "Last successful step (1–6)", exampleValue: "4 — Selfie / liveness" },
      { field: "ekyc_next_step", source: "ekyc", description: "Where to resume guidance", exampleValue: "5 — PAN verification" },
      { field: "ekyc_progress_percent", source: "ekyc", description: "Completion progress", exampleValue: "67%" },
      { field: "retry_count", source: "ekyc", description: "Attempts this session cycle", exampleValue: "2" },
      { field: "last_attempted_at", source: "ekyc", description: "Last try timestamp", exampleValue: "2024-11-15 15:42" },
      { field: "ekyc_link_status", source: "ekyc", description: "active | expired | not_sent", exampleValue: "active" },
      { field: "ekyc_link_expiry", source: "ekyc", description: "When link must be refreshed", exampleValue: "2024-11-17 15:42" },
      { field: "aadhaar_name_match_flag", source: "ekyc", description: "Demographic match result", exampleValue: "true" },
      { field: "pan_verification_status", source: "ekyc", description: "PAN step outcome", exampleValue: "not_attempted" },
      { field: "name_on_application", source: "crm", description: "Name on file for mismatch coaching", exampleValue: "Priya Singh" },
      { field: "phone_number", source: "crm", description: "Must match Aadhaar-linked mobile", exampleValue: "+91 98201 44192", sensitive: true },
      { field: "objection_history", source: "crm", description: "Prior objections on record", exampleValue: "[]" },
      { field: "preferred_contact_time", source: "crm", description: "Callback window preference", exampleValue: "evening" },
      { field: "kyc_complication_flag", source: "ekyc", description: "Compliance review needed", exampleValue: "false" },
      { field: "prior_call_attempts", source: "crm", description: "Outbound attempts count", exampleValue: "1" },
    ],
    agentGoal: "READ failure reason and last completed step. Explain to the customer exactly what failed and why (plain language). Walk them through remaining eKYC steps end-to-end on this call without human handoff unless compliance flag or retry_count > 3.",
    nextBestAction: "1) State ekyc_failure_reason_label clearly — not their fault unless data says mismatch. 2) Resume from ekyc_next_step with field-level guidance. 3) Re-trigger link if expired. 4) On success, explain VKYC (9AM–9PM) and offer slot. 5) Escalate ONLY if playbook exhausted or compliance_flag.",
    transitionEvent: "eKYC completion event from eKYC system",
    guardrails: [
      "Do not ask customer to share documents verbally",
      "Do not confirm identity without system verification",
      "Re-trigger link only after confirming customer identity via minimal system-verified check",
    ],
    fallback: "If retry count > 3, escalate to Inside Sales for human-assisted completion. Create support ticket.",
    metrics: {
      stageCompletionRate: 58,
      containmentRate: 66,
      escalationRate: 18,
      avgTimeToActivation: "4.8 days",
      dropOffRecoveryRate: 35,
      csat: 3.5,
    },
    failureMode: {
      affectedSystems: ["ekyc", "crm"],
      fallbackAction: "If eKYC system API times out, capture callback intent, write retry ticket, log reason code",
      agentBehavior: "Say you're unable to verify the current status, offer to arrange a callback, do not guess completion state",
    },
  },
  {
    id: "EKYC_COMPLETE",
    label: "eKYC Complete",
    shortLabel: "eKYC Done",
    description: "eKYC verified successfully. Customer now needs to schedule VKYC.",
    color: "#22c55e",
    activeSystems: ["ekyc", "vkyc", "crm", "bm_agent", "notification", "compliance", "analytics"],
    connections: [
      { from: "ekyc", to: "bm_agent", type: "READ", label: "eKYC completion timestamp, verification status" },
      { from: "vkyc", to: "bm_agent", type: "READ", label: "VKYC eligibility, available slots, window (9AM–9PM)" },
      { from: "crm", to: "bm_agent", type: "READ", label: "customer profile, preferred time" },
      { from: "bm_agent", to: "vkyc", type: "WRITE", label: "slot booking confirmation" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "VKYC scheduled, disposition" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "VKYC slot confirmation, reminder" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "consent for VKYC, audit log" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "stage transition, scheduling event" },
    ],
    dataAvailable: [
      { field: "ekyc_completion_time", source: "ekyc", description: "eKYC verified at", exampleValue: "2024-11-16 10:23" },
      { field: "ekyc_status", source: "ekyc", description: "Must be VERIFIED before VKYC talk", exampleValue: "VERIFIED" },
      { field: "vkyc_status", source: "vkyc", description: "Scheduling state", exampleValue: "NOT_SCHEDULED" },
      { field: "vkyc_eligibility", source: "vkyc", description: "Can book video KYC", exampleValue: "true" },
      { field: "available_vkyc_slots", source: "vkyc", description: "System-confirmed slots only", exampleValue: "5PM today, 9AM tomorrow" },
      { field: "vkyc_window", source: "vkyc", description: "Hard constraint for all slots", exampleValue: "09:00–21:00 IST" },
      { field: "preferred_time", source: "crm", description: "Customer time preference", exampleValue: "evening" },
      { field: "app_install_status", source: "activation", description: "Needed post-VKYC for activation", exampleValue: "installed" },
    ],
    agentGoal: "Confirm eKYC success. Teach VKYC process (what happens on video, documents, duration). Book slot. Preview post-VKYC activation steps so customer sees the full finish line.",
    nextBestAction: "Explain VKYC steps 1–3. Offer 2–3 slots in vkyc_window. Confirm original PAN on hand. NOTIFY confirmation. Tell customer: after VKYC → open Tiger app → activate → virtual card instant.",
    transitionEvent: "VKYC slot booked (CRM updated) OR VKYC session initiated",
    guardrails: [
      "Only offer slots within the 9 AM – 9 PM verified availability window",
      "Do not commit to a slot without system confirmation of availability",
    ],
    fallback: "If no VKYC slots available, log in CRM, send SMS with booking link, create follow-up reminder at next available window.",
    metrics: {
      stageCompletionRate: 72,
      containmentRate: 78,
      escalationRate: 9,
      avgTimeToActivation: "3.6 days",
      dropOffRecoveryRate: 52,
      csat: 4.0,
    },
    failureMode: {
      affectedSystems: ["vkyc"],
      fallbackAction: "If VKYC scheduling system is unavailable, send customer the direct booking link, log callback request",
      agentBehavior: "Acknowledge VKYC system delay, offer alternate booking URL, confirm manually",
    },
  },
  {
    id: "VKYC_PENDING",
    label: "VKYC Pending",
    shortLabel: "VKYC Pending",
    description: "VKYC slot booked or customer in VKYC window but hasn't completed the call.",
    color: "#f59e0b",
    activeSystems: ["vkyc", "crm", "bm_agent", "notification", "inside_sales", "compliance", "analytics"],
    connections: [
      { from: "vkyc", to: "bm_agent", type: "READ", label: "slot status, session status, no-show flag" },
      { from: "crm", to: "bm_agent", type: "READ", label: "objection history, call attempts" },
      { from: "bm_agent", to: "vkyc", type: "WRITE", label: "reschedule trigger, session retry" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "no-show disposition, retry reason" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "VKYC reminder, reschedule link" },
      { from: "bm_agent", to: "inside_sales", type: "ESCALATE", label: "repeated no-shows, escalation ticket" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "audit log" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "no-show event, reschedule rate" },
    ],
    dataAvailable: [
      { field: "vkyc_slot_time", source: "vkyc" },
      { field: "vkyc_no_show_count", source: "vkyc" },
      { field: "vkyc_session_status", source: "vkyc" },
      { field: "call_attempts", source: "crm" },
      { field: "objection_history", source: "crm" },
      { field: "time_window_remaining", source: "vkyc" },
    ],
    agentGoal: "Remind customer of pending VKYC. Offer to reschedule if needed. Reduce no-show rate.",
    nextBestAction: "Send reminder 2 hours before slot. If no-show, offer immediate reschedule. If repeated no-show (>2), escalate to Inside Sales with full context.",
    transitionEvent: "VKYC completion event from VKYC system",
    guardrails: [
      "VKYC is only available 9 AM – 9 PM; never suggest slots outside this window",
      "Do not attempt to complete verification verbally",
    ],
    fallback: "After 2 no-shows, route to Inside Sales for personal callback. Do not run more than 3 automated attempts.",
    metrics: {
      stageCompletionRate: 63,
      containmentRate: 70,
      escalationRate: 22,
      avgTimeToActivation: "3.0 days",
      dropOffRecoveryRate: 44,
      csat: 3.6,
    },
    failureMode: {
      affectedSystems: ["vkyc", "notification"],
      fallbackAction: "If VKYC system down, do not attempt voice verification, send direct booking link, create inside sales ticket",
      agentBehavior: "Apologise for system issue, provide VKYC booking URL directly, log for follow-up",
    },
  },
  {
    id: "VKYC_COMPLETE",
    label: "VKYC Complete",
    shortLabel: "VKYC Done",
    description: "VKYC verified. Customer is fully KYC-compliant and eligible for card activation.",
    color: "#22c55e",
    activeSystems: ["vkyc", "activation", "crm", "bm_agent", "notification", "compliance", "analytics"],
    connections: [
      { from: "vkyc", to: "bm_agent", type: "READ", label: "VKYC completion, verification timestamp" },
      { from: "activation", to: "bm_agent", type: "READ", label: "activation eligibility, app install status" },
      { from: "crm", to: "bm_agent", type: "READ", label: "customer profile, prior interactions" },
      { from: "bm_agent", to: "activation", type: "WRITE", label: "activation attempt trigger" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "activation nudge sent, disposition" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "activation deep-link, app store link" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "audit log" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "stage event, activation funnel entry" },
    ],
    dataAvailable: [
      { field: "vkyc_completion_time", source: "vkyc" },
      { field: "activation_eligibility", source: "activation" },
      { field: "app_install_status", source: "activation" },
      { field: "virtual_card_availability", source: "activation" },
      { field: "physical_card_eta", source: "activation" },
    ],
    agentGoal: "Congratulate on VKYC completion. Guide the customer to activate the card in-app. Highlight instant virtual card benefit.",
    nextBestAction: "Send in-app activation deep-link via WhatsApp. Mention that instant virtual card is ready. If app not installed, send app store link. If there's an app issue, create support ticket.",
    transitionEvent: "Activation completed (event from Activation System)",
    guardrails: [
      "Do not confirm activation without receiving system confirmation",
      "Do not share card details or CVV verbally under any circumstance",
      "If customer reports app crash, route to technical support — do not troubleshoot verbally",
    ],
    fallback: "If activation system unresponsive, log support ticket, advise customer to try app activation independently, schedule callback.",
    metrics: {
      stageCompletionRate: 81,
      containmentRate: 85,
      escalationRate: 7,
      avgTimeToActivation: "1.4 days",
      dropOffRecoveryRate: 68,
      csat: 4.2,
    },
    failureMode: {
      affectedSystems: ["activation"],
      fallbackAction: "Raise support ticket with activation system team, advise customer to attempt direct app activation",
      agentBehavior: "Acknowledge technical issue, provide workaround (direct app navigation), log for follow-up",
    },
  },
  {
    id: "ACTIVATION_PENDING",
    label: "Activation Pending",
    shortLabel: "Activating",
    description: "KYC complete but customer has not yet activated the card in-app.",
    color: "#a855f7",
    activeSystems: ["activation", "crm", "bm_agent", "notification", "inside_sales", "compliance", "analytics"],
    connections: [
      { from: "activation", to: "bm_agent", type: "READ", label: "activation status, virtual card status, failure reason" },
      { from: "crm", to: "bm_agent", type: "READ", label: "prior call attempts, app install status" },
      { from: "bm_agent", to: "activation", type: "WRITE", label: "activation retry trigger" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "activation block reason, disposition" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "activation link, app store link" },
      { from: "bm_agent", to: "inside_sales", type: "ESCALATE", label: "tech block escalation, support ticket" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "audit log" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "activation attempt event, block reason" },
    ],
    dataAvailable: [
      { field: "activation_status", source: "activation" },
      { field: "activation_failure_reason", source: "activation" },
      { field: "virtual_card_status", source: "activation" },
      { field: "physical_card_eta", source: "activation" },
      { field: "app_install_status", source: "activation" },
      { field: "call_attempts", source: "crm" },
      { field: "joining_fee_status", source: "card_core", sensitive: true },
    ],
    agentGoal: "Identify the activation blocker. Guide in-app activation. Resolve fee or app-install objections.",
    nextBestAction: "Confirm app is installed. Guide to activation screen step-by-step. If joining fee objection, surface lifetime-free positioning. If app issue, create technical support ticket + escalate to Inside Sales.",
    transitionEvent: "Activation success event from Activation System",
    guardrails: [
      "Do not disclose card number, CVV, or PIN verbally or via message",
      "Do not access card account beyond activation eligibility data",
      "Joining fee discussions must use only approved product copy",
    ],
    fallback: "If customer refuses activation after 3 attempts due to fee objection, log as 'price objection' and route to Inside Sales for human recovery.",
    metrics: {
      stageCompletionRate: 77,
      containmentRate: 80,
      escalationRate: 14,
      avgTimeToActivation: "0.8 days",
      dropOffRecoveryRate: 61,
      csat: 4.0,
    },
    failureMode: {
      affectedSystems: ["activation", "crm"],
      fallbackAction: "Create technical support ticket, escalate to inside sales, do not attempt card activation without system confirmation",
      agentBehavior: "Explain system issue, reassure customer nothing is wrong with their application, arrange callback",
    },
  },
  {
    id: "ACTIVE",
    label: "Card Active",
    shortLabel: "Active",
    description: "Card fully activated. Onboarding journey complete. Instant virtual card issued.",
    color: "#10b981",
    activeSystems: ["activation", "crm", "bm_agent", "notification", "analytics"],
    connections: [
      { from: "activation", to: "bm_agent", type: "READ", label: "active status, virtual card issued" },
      { from: "crm", to: "bm_agent", type: "READ", label: "welcome offer eligibility" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "onboarding complete, active state" },
      { from: "bm_agent", to: "notification", type: "NOTIFY", label: "welcome message, cashback education" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "activation success, journey complete" },
    ],
    dataAvailable: [
      { field: "card_active_status", source: "activation" },
      { field: "virtual_card_issued_at", source: "activation" },
      { field: "physical_card_eta", source: "activation" },
      { field: "welcome_cashback_status", source: "card_core" },
      { field: "amazon_prime_entitlement", source: "card_core" },
    ],
    agentGoal: "Confirm activation success. Stop onboarding calls. Optionally deliver brief welcome message with key benefits.",
    nextBestAction: "Send welcome SMS with virtual card note. Mention physical card ETA of 5–7 days. Briefly highlight ₹500 cashback + Prime offer. Close onboarding journey in CRM.",
    transitionEvent: "No further onboarding events required. Journey closed.",
    guardrails: [
      "No further onboarding outreach once journey is marked ACTIVE",
      "Only trigger welcome/education communication — not promotional upsell",
    ],
    fallback: "No fallback required at this stage. Any customer-initiated queries route to standard support.",
    metrics: {
      stageCompletionRate: 100,
      containmentRate: 92,
      escalationRate: 3,
      avgTimeToActivation: "0 days",
      dropOffRecoveryRate: 100,
      csat: 4.6,
    },
    failureMode: {
      affectedSystems: [],
      fallbackAction: "Standard support ticket for any post-activation issues",
      agentBehavior: "Journey is complete; any further calls are handled by standard support, not onboarding agent",
    },
  },
  {
    id: "ESCALATED",
    label: "Escalated / Needs Human",
    shortLabel: "Escalated",
    description: "Agent has exhausted automated paths. Human intervention required.",
    color: "#ef4444",
    activeSystems: ["crm", "bm_agent", "inside_sales", "compliance", "analytics"],
    connections: [
      { from: "crm", to: "bm_agent", type: "READ", label: "escalation reason, full call history" },
      { from: "bm_agent", to: "inside_sales", type: "ESCALATE", label: "escalation ticket, context bundle" },
      { from: "bm_agent", to: "crm", type: "WRITE", label: "escalation disposition, reason code" },
      { from: "bm_agent", to: "compliance", type: "WRITE", label: "complete audit trail, sensitive flag" },
      { from: "bm_agent", to: "analytics", type: "WRITE", label: "escalation event, root cause" },
      { from: "inside_sales", to: "crm", type: "WRITE", label: "human resolution outcome" },
    ],
    dataAvailable: [
      { field: "escalation_reason", source: "crm" },
      { field: "full_objection_history", source: "crm" },
      { field: "all_prior_call_attempts", source: "crm" },
      { field: "current_stage", source: "crm" },
      { field: "compliance_flags", source: "compliance", sensitive: true },
    ],
    agentGoal: "Gracefully hand off to a human agent with complete context. Ensure customer is not left without resolution.",
    nextBestAction: "Tell customer a specialist will call back within [X] hours. Write full escalation context to Inside Sales queue. Log all objections, attempts, and reason codes in CRM.",
    transitionEvent: "Human agent resolves and updates CRM with outcome",
    guardrails: [
      "Do not continue automated conversation after escalation decision",
      "Ensure all sensitive flags are logged in compliance layer",
      "Never close escalation ticket without resolution",
    ],
    fallback: "If Inside Sales queue is full, schedule callback with specific time window and confirm to customer.",
    metrics: {
      stageCompletionRate: 31,
      containmentRate: 0,
      escalationRate: 100,
      avgTimeToActivation: "9+ days",
      dropOffRecoveryRate: 19,
      csat: 2.8,
    },
    failureMode: {
      affectedSystems: ["inside_sales", "compliance"],
      fallbackAction: "If Inside Sales system unavailable, write escalation to CRM, confirm callback via SMS, do not leave customer without next step",
      agentBehavior: "Confirm callback has been arranged, provide a reference number if possible, close call gracefully",
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   OBJECTIONS — the 7 customer objection scenarios.

   Each record drives:
     - App.tsx: the chip strip (shortLabel)
     - AgentPanel Data Available tab: dataNeeded fields
     - AgentPanel Agent Logic tab: systemBehavior, agentLogic
     - transcript.ts: objectionId key → OBJECTION_TRANSCRIPTS lookup

   KEY CONTRACT: id must exactly match the corresponding key in
   OBJECTION_TRANSCRIPTS in transcript.ts. Mismatches produce empty objection
   transcripts with no runtime error (silent fallback via ?? []).
   ───────────────────────────────────────────────────────────────────────────── */
export const OBJECTIONS: ObjectionData[] = [
  {
    id: "joining_fee",
    label: "Joining Fee vs Lifetime Free",
    shortLabel: "Joining Fee",
    dataNeeded: [
      { field: "joining_fee_amount", system: "card_core" },
      { field: "lifetime_free_policy", system: "card_core" },
      { field: "welcome_cashback_₹500", system: "card_core" },
      { field: "amazon_prime_value_₹1499", system: "card_core" },
      { field: "approved_positioning_script", system: "compliance" },
    ],
    systemBehavior: "Read fee policy and welcome offer from Card Core. Use approved compliance script for response path. Do NOT improvise fee policy.",
    agentLogic: "Agent should: (1) confirm ₹499 is one-time only, not recurring; (2) offset with ₹500 cashback making net benefit positive; (3) mention Prime worth ₹1,499 as additional validation of value. If customer remains objecting after two exchanges, route to human.",
  },
  {
    id: "jewels_cashback",
    label: "Jewels Not Real Cashback",
    shortLabel: "Jewels Value",
    dataNeeded: [
      { field: "jewels_to_inr_conversion_rate", system: "card_core" },
      { field: "cashback_rates_by_category", system: "card_core" },
      { field: "jewels_redemption_paths", system: "card_core" },
    ],
    systemBehavior: "Fetch rewards mapping table from Card Core. Convert example spend to Jewels to INR in real-time during call.",
    agentLogic: "Agent should: (1) state the conversion: 5 Jewels = ₹1; (2) walk through a realistic spend example (₹10,000 on Amazon = 1,000 Jewels = ₹200); (3) confirm Jewels can be redeemed directly. Never generalize; always use approved conversion data.",
  },
  {
    id: "low_credit_limit",
    label: "Low Credit Limit",
    shortLabel: "Credit Limit",
    dataNeeded: [
      { field: "approved_credit_limit", system: "card_core" },
      { field: "limit_reason_code", system: "card_core" },
      { field: "limit_upgrade_policy", system: "card_core" },
    ],
    systemBehavior: "Read approved limit and reason code from Card Core. Surface upgrade path if available. Do not access underwriting data beyond approved limit value.",
    agentLogic: "Agent should: (1) acknowledge the limit; (2) position it as a starter limit that grows with usage history; (3) share that responsible usage typically leads to limit reviews within 6 months. Do NOT reveal underwriting logic or credit bureau data.",
  },
  {
    id: "already_have_card",
    label: "Already Have Another Card",
    shortLabel: "Have Another Card",
    dataNeeded: [
      { field: "customer_segment", system: "crm" },
      { field: "top_spend_categories", system: "crm" },
      { field: "cashback_rates_tiger_vs_generic", system: "card_core" },
    ],
    systemBehavior: "Read customer segment and usage context from CRM. Retrieve Tiger's differentiated cashback rates for relevant categories. Position as use-case fit, not replacement.",
    agentLogic: "Agent should: (1) validate the customer's existing card; (2) identify their top spend category from CRM; (3) show Tiger's rate advantage for that category (e.g. 10% on Amazon vs. standard 1%). Frame Tiger as the best card for specific use cases, not a general replacement.",
  },
  {
    id: "deactivation_concern",
    label: "Card Not Used / Deactivation",
    shortLabel: "Deactivation",
    dataNeeded: [
      { field: "usage_history", system: "crm" },
      { field: "reminder_history", system: "crm" },
      { field: "inactivity_threshold_policy", system: "card_core" },
    ],
    systemBehavior: "Read inactivity threshold from Card Core. Check prior engagement history from CRM. If customer shows genuine disinterest after threshold, log and stop outreach.",
    agentLogic: "Agent should: (1) clarify what the inactivity policy is (if applicable); (2) offer a minimal use-case to prevent deactivation; (3) if customer shows no intent to use, respect that and close journey — do not over-push.",
  },
  {
    id: "kyc_complexity",
    label: "KYC Too Complicated",
    shortLabel: "KYC Complexity",
    dataNeeded: [
      { field: "ekyc_failure_reason", system: "ekyc" },
      { field: "kyc_step_completed", system: "ekyc" },
      { field: "vkyc_availability_flag", system: "vkyc" },
      { field: "human_kyc_assist_option", system: "inside_sales" },
    ],
    systemBehavior: "Read failure reason and last-completed step from eKYC system. Use VKYC availability flag to suggest alternative. If repeated failures, flag for human-assisted KYC via Inside Sales.",
    agentLogic: "Agent owns full eKYC coaching — NOT a human handoff by default. (1) READ ekyc_failure_reason + ekyc_last_completed_step. (2) Explain failure in plain language using playbook. (3) Guide remaining steps field-by-field on the call. (4) Human assist only if kyc_complication_flag=true or retry_count>3 after full playbook. (5) After eKYC success, explain VKYC timing (9AM–9PM) and activation next steps.",
  },
  {
    id: "ad_miscommunication",
    label: "Ad Miscommunication",
    shortLabel: "Ad Mismatch",
    dataNeeded: [
      { field: "campaign_source", system: "crm" },
      { field: "original_offer_text", system: "crm" },
      { field: "current_applicable_offer", system: "card_core" },
      { field: "approved_disclaimer_script", system: "compliance" },
    ],
    systemBehavior: "Retrieve campaign source and offer text from CRM. Compare against current offer from Card Core. Use compliance-approved disclaimer script. Never invent offers not in system.",
    agentLogic: "Agent should: (1) pull the specific ad/campaign the customer references; (2) clarify what was in the ad vs. what applies now using approved text; (3) if genuine discrepancy, escalate with full context to compliance layer — do not attempt to resolve policy contradiction autonomously.",
  },
];

/**
 * Canonical display order of stages used by StageSelector to render the
 * left sidebar timeline. ESCALATED is last — it is rendered separately
 * below a "Exception Path" divider rather than inline with the main flow.
 */
export const STAGE_ORDER: StageId[] = [
  "APPROVED",
  "EKYC_PENDING",
  "EKYC_COMPLETE",
  "VKYC_PENDING",
  "VKYC_COMPLETE",
  "ACTIVATION_PENDING",
  "ACTIVE",
  "ESCALATED",
];
