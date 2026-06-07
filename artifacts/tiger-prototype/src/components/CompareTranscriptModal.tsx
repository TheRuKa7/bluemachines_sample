/**
 * CompareTranscriptModal.tsx — Side-by-side transcript comparison modal.
 *
 * Displays two independently-configurable transcript columns (Column A and Column B)
 * side by side so reviewers can compare agent behaviour across different stages,
 * objection scenarios, or normal vs. failure-mode conditions.
 *
 * Each column (TranscriptColumn) is a self-contained unit with:
 *   - A stage selector (dropdown)
 *   - An objection chip strip (disabled in failure mode — failure and objection are mutually exclusive)
 *   - A failure-mode toggle with a visual red border + red banner when active
 *   - A scrollable transcript area rendering all four turn types
 *   - A FlowBreakdownStrip at the bottom showing turn-type counts and a proportional
 *     colour-coded mini-timeline bar for quick structural comparison
 *   - A stage/objection/failure-mode badge footer
 *
 * Modal-level layout: header + legend strip, then the two columns separated by a
 * thin "vs" divider. Columns are independently scrollable.
 *
 * Turn types rendered (same visual treatment as CallTranscriptModal, slightly
 * smaller to fit in the narrower column):
 *   - "agent"    : small AI avatar + indigo bubble
 *   - "customer" : small C avatar + grey bubble (right-aligned)
 *   - "system"   : horizontal separator with system-tag chip + data annotation line
 *   - "thinking" : dashed indigo reasoning block with "Reasoning" badge
 *
 * FlowBreakdownStrip:
 *   - Counts turns by type: SYSTEM / THINK / AGENT / CUST
 *   - Renders a proportional 6px-tall horizontal bar where each segment is one turn,
 *     colour-coded by role — lets reviewers compare the structural "shape" of two
 *     calls at a glance without reading every turn.
 *
 * Keyboard: Escape closes the modal.
 */
import { useEffect, useRef, useState } from "react";
import { generateTranscript, type TranscriptTurn } from "@/data/transcript";
import { STAGES, OBJECTIONS, type StageId } from "@/data/model";

interface CompareTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  initialStageLeft: StageId;
  initialStageRight: StageId;
}

/* ─────────────────────────────────────────────────────────────────────────────
   System-tag colour map (same as CallTranscriptModal; duplicated here to keep
   each modal self-contained and independently editable).
   ───────────────────────────────────────────────────────────────────────────── */
const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  "CRM READ":              { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "CRM WRITE":             { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "eKYC READ":             { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "eKYC WRITE":            { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "VKYC READ":             { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "VKYC WRITE":            { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "ACTIVATION READ":       { bg: "rgba(168,85,247,0.10)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  "ACTIVATION WRITE":      { bg: "rgba(168,85,247,0.10)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  "CARD CORE READ":        { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  "NOTIFY":                { bg: "rgba(245,158,11,0.10)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  "COMPLIANCE WRITE":      { bg: "rgba(249,115,22,0.10)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  "ANALYTICS WRITE":       { bg: "rgba(6,182,212,0.10)",  text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  "INSIDE SALES ESCALATE": { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "INSIDE SALES NOTIFY":   { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "FAILURE":               { bg: "rgba(239,68,68,0.15)",  text: "#ef4444", border: "rgba(239,68,68,0.40)" },
};

/** Returns colour styles for a system-tag string, falling back to neutral grey. */
function getTagStyle(tag: string) {
  return tagColors[tag] ?? { bg: "rgba(100,100,100,0.10)", text: "#9ca3af", border: "rgba(100,100,100,0.25)" };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Turn renderers (compact variants — slightly smaller text to fit column width)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * System event turn — tag chip on a separator line, data annotation below.
 * The tag and annotation are split onto two lines for legibility in narrow columns.
 */
function SystemTurn({ turn }: { turn: TranscriptTurn }) {
  const style = turn.systemTag ? getTagStyle(turn.systemTag) : getTagStyle("");
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 opacity-30" style={{ background: style.text }} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {turn.systemTag && (
              <span
                className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono"
                style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
              >
                {turn.systemTag}
              </span>
            )}
          </div>
          <div className="h-px flex-1 opacity-30" style={{ background: style.text }} />
        </div>
        {/* Data annotation line below the tag chip */}
        {turn.text && (
          <p className="text-[9px] italic leading-relaxed px-1" style={{ color: "rgba(156,163,175,0.80)" }}>
            {turn.text}
          </p>
        )}
      </div>
    </div>
  );
}

/** Compact agent turn for the narrower compare column. */
function AgentTurn({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <span className="text-[7px] font-black text-primary">AI</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[8px] uppercase tracking-wider text-primary/70 font-semibold mb-0.5">Agent · Aria</div>
        <div className="bg-primary/8 border border-primary/15 rounded-lg rounded-tl-none px-2.5 py-1.5">
          <p className="text-[11px] text-foreground/90 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact reasoning turn — same semantics as CallTranscriptModal's ThinkingTurn
 * but slightly smaller to suit the column layout.
 */
function ThinkingTurn({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-shrink-0 mt-0.5 w-5 flex justify-center">
        <div
          className="w-4 h-4 rounded border flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.25)" }}
        >
          <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3" stroke="#818cf8" strokeWidth="1"/>
            <path d="M4 2.5V4.5M4 5.5V5.5" stroke="#818cf8" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded font-mono"
            style={{ background: "rgba(99,102,241,0.10)", color: "#818cf8", border: "1px dashed rgba(99,102,241,0.20)" }}
          >
            Reasoning
          </span>
          <span className="text-[7px] italic" style={{ color: "rgba(156,163,175,0.40)" }}>internal · not spoken</span>
        </div>
        <div
          className="rounded-lg px-2.5 py-1.5"
          style={{ background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.18)" }}
        >
          <p className="text-[10px] italic leading-relaxed" style={{ color: "rgba(165,180,252,0.70)" }}>{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

/** Compact customer turn (right-aligned) for the narrower compare column. */
function CustomerTurn({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className="flex gap-2 items-start flex-row-reverse">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-5 h-5 rounded-full bg-muted/50 border border-border flex items-center justify-center">
          <span className="text-[7px] font-black text-muted-foreground">C</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="text-[8px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-0.5">Customer · Priya</div>
        <div className="bg-muted/30 border border-border/60 rounded-lg rounded-tr-none px-2.5 py-1.5 max-w-[88%]">
          <p className="text-[11px] text-foreground/80 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FlowBreakdownStrip
   ───────────────────────────────────────────────────────────────────────────── */

/** Turn-type counts used by FlowBreakdownStrip. */
type TurnTypeCount = { system: number; thinking: number; agent: number; customer: number };

/**
 * A compact strip below each transcript column showing:
 *   1. Count badges per turn type (e.g. "3× SYS", "4× THINK", "6× AGENT", "6× CUST")
 *   2. A proportional 6px mini-timeline bar where each turn is one colour-coded segment.
 *
 * This lets reviewers instantly compare the structural "shape" of two conversations
 * — e.g. one column has more thinking turns, another has more system events — without
 * reading the full text.
 */
function FlowBreakdownStrip({ turns }: { turns: TranscriptTurn[] }) {
  /* Count each turn type. */
  const counts: TurnTypeCount = { system: 0, thinking: 0, agent: 0, customer: 0 };
  turns.forEach((t) => {
    if (t.role === "system") counts.system++;
    else if (t.role === "thinking") counts.thinking++;
    else if (t.role === "agent") counts.agent++;
    else if (t.role === "customer") counts.customer++;
  });

  /* Sequential turn-role list drives the mini-timeline segments. */
  const sequence = turns.map((t) => t.role);

  /** One colour per turn type. */
  const roleColor: Record<string, string> = {
    system: "#22d3ee",
    thinking: "#818cf8",
    agent: "#6366f1",
    customer: "#9ca3af",
  };
  /** Short label used in the count badges. */
  const roleLabel: Record<string, string> = {
    system: "SYS",
    thinking: "THINK",
    agent: "AGENT",
    customer: "CUST",
  };

  return (
    <div className="flex-shrink-0 border-t border-border/30 bg-card/10 px-3 py-2">
      {/* Count badges row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[7px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Flow</span>
        <div className="flex items-center gap-1 flex-wrap">
          {(["system", "thinking", "agent", "customer"] as const).map((role) =>
            counts[role] > 0 ? (
              <span
                key={role}
                className="text-[7px] font-semibold px-1 py-0.5 rounded font-mono"
                style={{
                  background: `${roleColor[role]}12`,
                  color: roleColor[role],
                  border: `1px solid ${roleColor[role]}30`,
                }}
              >
                {counts[role]}× {roleLabel[role]}
              </span>
            ) : null
          )}
        </div>
      </div>
      {/* Proportional mini-timeline bar: each turn is one flex-1 segment. */}
      <div className="flex items-center gap-px overflow-hidden rounded" style={{ height: "6px" }}>
        {sequence.map((role, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-sm"
            style={{ background: roleColor[role] ?? "#4b5563", minWidth: "2px", opacity: 0.75 }}
            title={role}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TranscriptColumn
   ───────────────────────────────────────────────────────────────────────────── */

/** The configuration state for a single column in compare mode. */
interface ColumnState {
  stageId: StageId;
  objectionId: string | null;
  failureMode: boolean;
}

/**
 * Self-contained transcript column component.
 *
 * Renders the full column UI for one side of the comparison:
 *   - Header with A/B badge + stage dropdown + failure toggle
 *   - Objection chip strip (disabled in failure mode)
 *   - Failure banner (visible when failureMode=true)
 *   - Scrollable transcript area
 *   - FlowBreakdownStrip
 *   - Stage/objection/failure footer badges
 *
 * The `onChange` callback is a partial update — callers spread the delta
 * onto the existing state to avoid full resets (e.g. changing the stage
 * clears the objection but not the failure-mode flag).
 *
 * Note: changing stage also resets objectionId to null to avoid carrying
 * an objection that may not be relevant to the new stage.
 */
function TranscriptColumn({
  side,
  state,
  onChange,
}: {
  side: "left" | "right";
  state: ColumnState;
  onChange: (next: Partial<ColumnState>) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stage = STAGES.find((s) => s.id === state.stageId)!;
  const turns = generateTranscript(state.stageId, state.objectionId, state.failureMode);

  /* Scroll to top whenever the column configuration changes. */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [state.stageId, state.objectionId, state.failureMode]);

  /** Toggle objection: clicking the same chip clears the selection. */
  const handleObjectionClick = (id: string) => {
    onChange({ objectionId: state.objectionId === id ? null : id });
  };

  return (
    <div
      className="flex flex-col flex-1 min-w-0 rounded-lg overflow-hidden bg-card/20"
      style={{
        /* Red border when failure mode is active; normal border otherwise. */
        border: state.failureMode
          ? "1px solid rgba(239,68,68,0.50)"
          : "1px solid var(--border)",
        boxShadow: state.failureMode ? "0 0 0 1px rgba(239,68,68,0.15) inset" : undefined,
      }}
    >
      {/* ── Column header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0"
        style={{
          /* Background shifts to a red tint in failure mode. */
          background: state.failureMode ? "rgba(239,68,68,0.06)" : `${stage.color}08`,
          borderBottomColor: state.failureMode ? "rgba(239,68,68,0.25)" : `${stage.color}25`,
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* "A" or "B" side badge coloured in the stage's theme colour */}
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0"
            style={{
              background: `${stage.color}18`,
              color: stage.color,
              border: `1px solid ${stage.color}35`,
            }}
          >
            {side === "left" ? "A" : "B"}
          </span>
          {/* Stage picker — changing stage also resets the objection selection */}
          <select
            value={state.stageId}
            onChange={(e) => onChange({ stageId: e.target.value as StageId, objectionId: null })}
            className="flex-1 min-w-0 text-[10px] font-semibold bg-transparent border border-border/50 rounded px-1.5 py-0.5 text-foreground cursor-pointer focus:outline-none"
            style={{ color: stage.color }}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id} style={{ background: "#1a1a2e", color: "#e5e7eb" }}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {/* Per-column failure toggle — independent of the main app's global failure mode */}
        <button
          onClick={() => onChange({ failureMode: !state.failureMode })}
          className={`
            flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider transition-all border flex-shrink-0
            ${state.failureMode
              ? "bg-red-950/60 border-red-800/60 text-red-400"
              : "bg-transparent border-border text-muted-foreground hover:text-foreground"
            }
          `}
        >
          <div
            className={`w-1 h-1 rounded-full transition-all ${state.failureMode ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          Failure
        </button>
      </div>

      {/* ── Objection chip strip ──────────────────────────────────────── */}
      {/* Chips are disabled while failure mode is active — failure transcripts
          are mutually exclusive with objection transcripts. */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-card/10 flex-shrink-0 overflow-x-auto scrollbar-none">
        <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold flex-shrink-0">Objection</span>
        {OBJECTIONS.map((obj) => (
          <button
            key={obj.id}
            onClick={() => handleObjectionClick(obj.id)}
            disabled={state.failureMode}
            className={`
              flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-medium transition-all border whitespace-nowrap
              ${state.objectionId === obj.id
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              }
            `}
          >
            {obj.shortLabel}
          </button>
        ))}
        {state.objectionId && (
          <button
            onClick={() => onChange({ objectionId: null })}
            className="flex-shrink-0 text-[8px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-dashed border-border/60"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Failure banner ────────────────────────────────────────────── */}
      {/* Shows the affected systems and the agent's fallback behaviour text
          from model.ts when failure mode is on for this column. */}
      {state.failureMode && (
        <div
          className="flex-shrink-0 flex items-start gap-2 px-3 py-2 border-b"
          style={{
            background: "rgba(239,68,68,0.08)",
            borderColor: "rgba(239,68,68,0.25)",
          }}
        >
          <div className="flex-shrink-0 mt-0.5">
            <div
              className="w-4 h-4 rounded flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.40)" }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M4 1L7 7H1L4 1Z" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round"/>
                <path d="M4 3.5V5M4 6V6" stroke="#ef4444" strokeWidth="1" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-bold uppercase tracking-wider text-red-400 mb-0.5">System Failure Active</div>
            <p className="text-[9px] leading-relaxed" style={{ color: "rgba(239,68,68,0.75)" }}>
              {stage.failureMode.affectedSystems.length > 0
                ? `${stage.failureMode.affectedSystems.map((s) => s.toUpperCase()).join(" + ")} unavailable · ${stage.failureMode.agentBehavior}`
                : stage.failureMode.agentBehavior}
            </p>
          </div>
          {/* Animated "FAILURE" badge in the top-right of the banner */}
          <span
            className="flex-shrink-0 flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
            FAILURE
          </span>
        </div>
      )}

      {/* ── Transcript scroll area ───────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {turns.map((turn, i) => {
          if (turn.role === "system") return <SystemTurn key={i} turn={turn} />;
          if (turn.role === "thinking") return <ThinkingTurn key={i} turn={turn} />;
          if (turn.role === "agent") return <AgentTurn key={i} turn={turn} />;
          return <CustomerTurn key={i} turn={turn} />;
        })}
        {/* "End of call" divider */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest">End of call</span>
          <div className="h-px flex-1 bg-border/40" />
        </div>
      </div>

      {/* ── Flow breakdown mini-timeline ─────────────────────────────── */}
      <FlowBreakdownStrip turns={turns} />

      {/* ── Stage / objection / failure footer badges ─────────────────── */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-border/30 bg-card/20 flex items-center gap-2">
        <span className="text-[8px] text-muted-foreground/50">Stage:</span>
        <span
          className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${stage.color}12`, color: stage.color, border: `1px solid ${stage.color}25` }}
        >
          {stage.label}
        </span>
        {state.objectionId && (
          <>
            <span className="text-[8px] text-muted-foreground/50">·</span>
            <span className="text-[8px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
              {OBJECTIONS.find((o) => o.id === state.objectionId)?.shortLabel}
            </span>
          </>
        )}
        {state.failureMode && (
          <>
            <span className="text-[8px] text-muted-foreground/50">·</span>
            <span className="text-[8px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
              Failure
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────────────────────── */

export function CompareTranscriptModal({
  open,
  onClose,
  initialStageLeft,
  initialStageRight,
}: CompareTranscriptModalProps) {
  /* Each column tracks its own stage, objection, and failure state independently. */
  const [left, setLeft] = useState<ColumnState>({
    stageId: initialStageLeft,
    objectionId: null,
    failureMode: false,
  });
  const [right, setRight] = useState<ColumnState>({
    stageId: initialStageRight,
    objectionId: null,
    failureMode: false,
  });

  /* Sync columns to the latest initial stages when the modal re-opens. */
  useEffect(() => {
    if (open) {
      setLeft({ stageId: initialStageLeft, objectionId: null, failureMode: false });
      setRight({ stageId: initialStageRight, objectionId: null, failureMode: false });
    }
  }, [open, initialStageLeft, initialStageRight]);

  /* Keyboard: Escape closes the modal. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const leftStage = STAGES.find((s) => s.id === left.stageId)!;
  const rightStage = STAGES.find((s) => s.id === right.stageId)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.70)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ width: "min(1200px, 97vw)", height: "min(88vh, 860px)" }}
      >
        {/* ── Modal header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Compare Mode
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span className="text-[10px] text-muted-foreground">
              Side-by-side transcript comparison · each column is independently configurable
            </span>
            <div className="w-px h-4 bg-border" />
            {/* Live "A vs B" badges showing each column's current stage */}
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${leftStage.color}15`, color: leftStage.color, border: `1px solid ${leftStage.color}30` }}
              >
                A · {leftStage.shortLabel}
              </span>
              <span className="text-[10px] text-muted-foreground/50">vs</span>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${rightStage.color}15`, color: rightStage.color, border: `1px solid ${rightStage.color}30` }}
              >
                B · {rightStage.shortLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-lg leading-none"
            aria-label="Close compare"
          >
            ×
          </button>
        </div>

        {/* ── Legend strip ──────────────────────────────────────────── */}
        {/* Shows turn-type icons, reasoning badge, flow strip explanation,
            and the first 5 system-tag colour chips as a quick reference. */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-border/50 bg-card/20 flex-shrink-0 overflow-x-auto scrollbar-none">
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold flex-shrink-0">Legend</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="text-[7px] font-black text-primary">AI</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Agent</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-muted/50 border border-border flex items-center justify-center">
              <span className="text-[7px] font-black text-muted-foreground">C</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Customer</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded font-mono"
              style={{ background: "rgba(99,102,241,0.10)", color: "#818cf8", border: "1px dashed rgba(99,102,241,0.25)" }}
            >
              Reasoning
            </span>
            <span className="text-[9px] text-muted-foreground">Agent internal</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Gradient bar representing the 4 turn-type colours in the flow strip */}
            <div
              className="h-2 w-12 rounded"
              style={{ background: "linear-gradient(90deg, #22d3ee22, #818cf822, #6366f122, #9ca3af22)" }}
            />
            <span className="text-[9px] text-muted-foreground">Flow strip</span>
          </div>
          {/* First 5 system-tag colour chips for reference */}
          {Object.entries(tagColors).slice(0, 5).map(([tag, style]) => (
            <div key={tag} className="flex items-center gap-1 flex-shrink-0">
              <span
                className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded font-mono"
                style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
              >
                {tag.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>

        {/* ── Two-column comparison area ───────────────────────────── */}
        <div className="flex flex-1 min-h-0 gap-3 p-3 overflow-hidden">
          <TranscriptColumn
            side="left"
            state={left}
            onChange={(next) => setLeft((prev) => ({ ...prev, ...next }))}
          />
          {/* Thin "vs" divider between columns */}
          <div className="flex flex-col items-center justify-center flex-shrink-0 gap-2 py-8">
            <div className="w-px flex-1 bg-border/40" />
            <span className="text-[9px] text-muted-foreground/40 uppercase tracking-widest rotate-0 select-none px-1">vs</span>
            <div className="w-px flex-1 bg-border/40" />
          </div>
          <TranscriptColumn
            side="right"
            state={right}
            onChange={(next) => setRight((prev) => ({ ...prev, ...next }))}
          />
        </div>
      </div>
    </div>
  );
}
