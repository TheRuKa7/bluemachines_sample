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
import { getStageScaffold } from "@/data/vapi-prompt";

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
    { id: "logic", label: "Agent logic" },
    { id: "data", label: "Data fields" },
    { id: "compliance", label: "Prompt & guardrails" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Agent design</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Syncs with stage and scenario</p>
      </div>
      <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2" role="tablist" aria-label="Agent inspector">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* ── Failure mode banner (all tabs) ─────────────────────────── */}
        {/* When failure mode is on, this banner always appears at the top,
            surfacing the affected systems and the agent's fallback behaviour
            regardless of which tab is active. */}
        {failureMode && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-800">System failure mode</p>
            <p className="mt-1 text-sm leading-relaxed text-red-700">{stage.failureMode.agentBehavior}</p>
            <p className="mt-2 text-xs text-red-600">{stage.failureMode.fallbackAction}</p>
          </div>
        )}

        {/* ── AGENT LOGIC tab ─────────────────────────────────────────── */}
        {activeTab === "logic" && (
          <div className="space-y-4">
            <Section title="Agent Goal" color={stage.color}>
              <p className="text-sm text-foreground/90 leading-relaxed">{stage.agentGoal}</p>
            </Section>

            {/* Next Best Action is suppressed in failure mode because the agent
                cannot execute the normal flow when key systems are offline. */}
            {!failureMode && (
              <Section title="Next Best Action" color="#22c55e">
                <p className="text-sm text-foreground/90 leading-relaxed">{stage.nextBestAction}</p>
              </Section>
            )}

            <Section title="Transition Event" color="#8b5cf6">
              <p className="text-sm text-muted-foreground leading-relaxed">{stage.transitionEvent}</p>
            </Section>

            <Section title="Fallback" color="#f59e0b">
              <p className="text-sm text-muted-foreground leading-relaxed">{stage.fallback}</p>
            </Section>

            {/* Objection detail renders only when an objection chip is active */}
            {objection && <ObjectionView objection={objection} />}

            {/* Prompt hint to select an objection when none is active */}
            {!objection && (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Select an objection below the diagram to see handling logic.
              </p>
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
            {/* Additional compliance requirements that apply specifically in failure mode */}
            {failureMode && (
              <Section title="Failure compliance" color="#ef4444">
                <p className="text-sm leading-relaxed text-red-700">
                  Log all failure states to Compliance with reason codes. Escalations need full context bundle.
                  Never guess missing data.
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
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2" style={{ background: `${color}08` }}>
        <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold text-foreground">{title}</span>
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
    <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/50">
      <div className="border-b border-amber-200 px-3 py-2">
        <span className="text-xs font-semibold text-amber-900">{objection.label}</span>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">System behavior</p>
          <p className="text-sm leading-relaxed text-foreground">{objection.systemBehavior}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Agent logic</p>
          <p className="text-sm leading-relaxed text-foreground">{objection.agentLogic}</p>
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
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
      {getStageScaffold(stage)}
    </pre>
  );
}
