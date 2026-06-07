/**
 * AgentPanel.tsx — Right sidebar: agent knowledge & compliance inspector.
 *
 * Three tabs surface different dimensions of the agent's decision-making for the
 * currently selected stage (and optional objection / failure mode):
 *
 *   AGENT LOGIC tab
 *     - Agent Goal            : the primary objective for this stage
 *     - Next Best Action      : the immediate action the agent should take
 *                               (hidden in failure mode — agent cannot proceed normally)
 *     - Transition Event      : what system event moves the customer to the next stage
 *     - Fallback              : what happens when the normal path fails
 *     - Objection view        : data-backed handling logic for the selected objection
 *
 *   DATA AVAILABLE tab
 *     - Fields Available to Agent : every data field the agent can read this stage,
 *                                   with PII-sensitive fields flagged
 *     - Active Systems            : the system nodes that are live for this stage
 *     - Objection Data            : the specific fields needed to resolve the active objection
 *
 *   GUARDRAILS tab
 *     - Guardrails           : the compliance constraints the agent must not breach
 *     - Prompt Scaffold      : the structured system-prompt template for this stage
 *     - Compliance Layer     : description of the audit / consent / data-access policy
 *     - Failure Compliance   : additional logging requirements in failure mode
 *
 * A red failure banner appears at the top of every tab when failureMode is active,
 * summarising which systems are offline and what the agent's fallback behaviour is.
 */
import { useState } from "react";
import { STAGES, OBJECTIONS, SYSTEMS, type StageId, type ObjectionData } from "@/data/model";

interface AgentPanelProps {
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
}

/** The three tabs available in AgentPanel. */
type Tab = "data" | "logic" | "compliance";

/* ─────────────────────────────────────────────────────────────────────────────
   Lookup helpers built at module-load time to avoid repeated array searches.
   ───────────────────────────────────────────────────────────────────────────── */

/** Maps system IDs to their short display labels (e.g. "card_core" → "Card Core"). */
const systemLabels: Record<string, string> = {};
SYSTEMS.forEach((s) => { systemLabels[s.id] = s.shortLabel; });

/**
 * Colour palette for system-source badges and active-systems chips.
 * Each system has a distinct hue so reviewers can visually trace data provenance.
 */
const arrowColors: Record<string, string> = {
  card_core: "#3b82f6",
  crm: "#8b5cf6",
  ekyc: "#22c55e",
  vkyc: "#10b981",
  activation: "#a855f7",
  bm_agent: "#f59e0b",
  notification: "#f59e0b",
  inside_sales: "#ef4444",
  compliance: "#f97316",
  analytics: "#06b6d4",
};

export function AgentPanel({ selectedStage, selectedObjection, failureMode }: AgentPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("logic");

  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = OBJECTIONS.find((o) => o.id === selectedObjection) ?? null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "logic", label: "Agent Logic" },
    { id: "data", label: "Data Available" },
    { id: "compliance", label: "Guardrails" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-border mb-0 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px
              ${activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── Failure mode banner (all tabs) ─────────────────────────── */}
        {/* When failure mode is on, this banner always appears at the top,
            surfacing the affected systems and the agent's fallback behaviour
            regardless of which tab is active. */}
        {failureMode && (
          <div className="rounded-md border border-red-800/60 bg-red-950/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">System Failure Mode</span>
            </div>
            <p className="text-[11px] text-red-300/80 leading-relaxed mb-2">{stage.failureMode.agentBehavior}</p>
            <div className="mt-2 pt-2 border-t border-red-800/40">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Fallback Action</p>
              <p className="text-[11px] text-red-200/70">{stage.failureMode.fallbackAction}</p>
            </div>
          </div>
        )}

        {/* ── AGENT LOGIC tab ─────────────────────────────────────────── */}
        {activeTab === "logic" && (
          <div className="space-y-4">
            <Section title="Agent Goal" color={stage.color}>
              <p className="text-[12px] text-foreground/90 leading-relaxed">{stage.agentGoal}</p>
            </Section>

            {/* Next Best Action is suppressed in failure mode because the agent
                cannot execute the normal flow when key systems are offline. */}
            {!failureMode && (
              <Section title="Next Best Action" color="#22c55e">
                <p className="text-[12px] text-foreground/90 leading-relaxed">{stage.nextBestAction}</p>
              </Section>
            )}

            <Section title="Transition Event" color="#8b5cf6">
              <p className="text-[12px] text-muted-foreground leading-relaxed">{stage.transitionEvent}</p>
            </Section>

            <Section title="Fallback" color="#f59e0b">
              <p className="text-[12px] text-muted-foreground leading-relaxed">{stage.fallback}</p>
            </Section>

            {/* Objection detail renders only when an objection chip is active */}
            {objection && <ObjectionView objection={objection} />}

            {/* Prompt hint to select an objection when none is active */}
            {!objection && (
              <div className="rounded-md border border-dashed border-border p-3">
                <p className="text-[11px] text-muted-foreground text-center">Select an objection below to see the data dependencies for that scenario</p>
              </div>
            )}
          </div>
        )}

        {/* ── DATA AVAILABLE tab ─────────────────────────────────────── */}
        {activeTab === "data" && (
          <div className="space-y-4">
            {/* List of every data field the agent can access this stage.
                PII-sensitive fields are highlighted with an orange "PII" badge.
                The source system badge uses the system's theme colour. */}
            <Section title="Fields Available to Agent" color={stage.color}>
              <div className="space-y-1.5">
                {stage.dataAvailable.map((field) => (
                  <div key={field.field} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2">
                      {field.sensitive && (
                        <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1 py-0.5 font-mono uppercase">PII</span>
                      )}
                      <span className="text-[11px] font-mono text-foreground/80">{field.field}</span>
                    </div>
                    {/* Source system badge — background is the system colour at 20% opacity */}
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0"
                      style={{
                        background: `${arrowColors[field.source]}20`,
                        color: arrowColors[field.source],
                        border: `1px solid ${arrowColors[field.source]}30`,
                      }}
                    >
                      {systemLabels[field.source]}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* All systems that are live during this stage (receive reads or writes). */}
            <Section title="Active Systems This Stage" color={stage.color}>
              <div className="flex flex-wrap gap-1.5">
                {stage.activeSystems.map((sysId) => (
                  <span
                    key={sysId}
                    className="text-[10px] px-2 py-1 rounded font-medium"
                    style={{
                      background: `${arrowColors[sysId]}15`,
                      color: arrowColors[sysId],
                      border: `1px solid ${arrowColors[sysId]}25`,
                    }}
                  >
                    {systemLabels[sysId]}
                  </span>
                ))}
              </div>
            </Section>

            {/* Additional data fields required specifically to resolve the active objection */}
            {objection && (
              <Section title={`Objection Data: ${objection.label}`} color="#f59e0b">
                <div className="space-y-1.5">
                  {objection.dataNeeded.map((d) => (
                    <div key={d.field} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
                      <span className="text-[11px] font-mono text-foreground/80">{d.field}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0"
                        style={{
                          background: `${arrowColors[d.system]}20`,
                          color: arrowColors[d.system],
                          border: `1px solid ${arrowColors[d.system]}30`,
                        }}
                      >
                        {systemLabels[d.system]}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── GUARDRAILS (Compliance) tab ─────────────────────────────── */}
        {activeTab === "compliance" && (
          <div className="space-y-4">
            {/* Hard constraints the agent must never violate */}
            <Section title="Guardrails" color="#f97316">
              <div className="space-y-2">
                {stage.guardrails.map((g, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed">{g}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* The structured system-prompt template the agent uses for this stage.
                Shows only the READ fields and STOP conditions relevant to the stage. */}
            <Section title="Prompt Scaffold (This Stage)" color="#3b82f6">
              <PromptScaffold stage={selectedStage} />
            </Section>

            {/* Static explanation of the platform-level compliance architecture */}
            <Section title="Compliance Layer" color="#f97316">
              <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                <p><span className="text-orange-400 font-semibold">Consent Check:</span> Verify consent_state before outreach. If missing, route to compliant callback.</p>
                <p><span className="text-orange-400 font-semibold">Audit Log:</span> Every outbound contact and sensitive action is written to the Compliance / Audit layer.</p>
                <p><span className="text-orange-400 font-semibold">Data Boundary:</span> Agent accesses only stage-relevant fields. PII fields are marked and access-logged.</p>
                <p><span className="text-orange-400 font-semibold">Script Compliance:</span> Only approved product copy is used. No improvisation on policy claims.</p>
              </div>
            </Section>

            {/* Additional compliance requirements that apply specifically in failure mode */}
            {failureMode && (
              <Section title="Failure Compliance" color="#ef4444">
                <p className="text-[11px] text-red-300/80 leading-relaxed">
                  All failure states must be logged to the Compliance / Audit layer with reason codes.
                  Human escalations must include the full context bundle including call transcript and objection history.
                  Missing data must never be guessed — log and escalate.
                </p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Labelled card wrapper used throughout all three tabs.
 * The coloured dot and heading use the `color` prop; content is freeform children.
 */
function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ background: `${color}10`, borderBottom: `1px solid ${color}20` }}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

/**
 * Renders the agent-logic detail view for the currently selected objection.
 * Shows two rows: "System Behavior" (what systems do) and "Agent Logic" (decision rules).
 */
function ObjectionView({ objection }: { objection: ObjectionData }) {
  return (
    <div className="rounded-md border border-amber-800/40 overflow-hidden">
      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Objection: {objection.label}</span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">System Behavior</p>
          <p className="text-[11px] text-foreground/80 leading-relaxed">{objection.systemBehavior}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Agent Logic</p>
          <p className="text-[11px] text-foreground/80 leading-relaxed">{objection.agentLogic}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the structured system-prompt template for a given stage as a monospace
 * pre-formatted block. Each template specifies:
 *   - ROLE     : the agent's persona for this stage
 *   - OBJECTIVE: the goal in one sentence
 *   - READ     : the specific data fields the agent loads at call start
 *   - FLOW     : the high-level conversation steps
 *   - STOP     : hard constraints (guardrails encoded into the prompt)
 */
function PromptScaffold({ stage }: { stage: StageId }) {
  const prompts: Record<StageId, string> = {
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

  return (
    <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap bg-background/50 p-2 rounded border border-border/50 overflow-x-auto">
      {prompts[stage]}
    </pre>
  );
}
