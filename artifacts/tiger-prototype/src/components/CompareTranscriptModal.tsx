import { useEffect, useRef, useState } from "react";
import { generateTranscript, type TranscriptTurn } from "@/data/transcript";
import { STAGES, OBJECTIONS, type StageId } from "@/data/model";

interface CompareTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  initialStageLeft: StageId;
  initialStageRight: StageId;
}

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  "CRM READ":              { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "CRM WRITE":             { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "eKYC READ":             { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "eKYC WRITE":            { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "VKYC READ":             { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "VKYC WRITE":            { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "ACTIVATION READ":       { bg: "rgba(168,85,247,0.10)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  "CARD CORE READ":        { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  "NOTIFY":                { bg: "rgba(245,158,11,0.10)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  "COMPLIANCE WRITE":      { bg: "rgba(249,115,22,0.10)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  "ANALYTICS WRITE":       { bg: "rgba(6,182,212,0.10)",  text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  "INSIDE SALES ESCALATE": { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "INSIDE SALES NOTIFY":   { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "FAILURE":               { bg: "rgba(239,68,68,0.15)",  text: "#ef4444", border: "rgba(239,68,68,0.40)" },
};

function getTagStyle(tag: string) {
  return tagColors[tag] ?? { bg: "rgba(100,100,100,0.10)", text: "#9ca3af", border: "rgba(100,100,100,0.25)" };
}

function SystemTurn({ turn }: { turn: TranscriptTurn }) {
  const style = turn.systemTag ? getTagStyle(turn.systemTag) : getTagStyle("");
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-1 flex items-center gap-2">
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
          <span className="text-[9px] text-muted-foreground/70 italic">{turn.text}</span>
        </div>
        <div className="h-px flex-1 opacity-30" style={{ background: style.text }} />
      </div>
    </div>
  );
}

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

interface ColumnState {
  stageId: StageId;
  objectionId: string | null;
  failureMode: boolean;
}

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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [state.stageId, state.objectionId, state.failureMode]);

  const handleObjectionClick = (id: string) => {
    onChange({ objectionId: state.objectionId === id ? null : id });
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 border border-border rounded-lg overflow-hidden bg-card/20">
      {/* Column Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0"
        style={{ background: `${stage.color}08`, borderBottomColor: `${stage.color}25` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
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
          {state.failureMode ? "Failure" : "Failure"}
        </button>
      </div>

      {/* Objection Strip */}
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

      {/* Transcript Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
        {turns.map((turn, i) => {
          if (turn.role === "system") return <SystemTurn key={i} turn={turn} />;
          if (turn.role === "agent") return <AgentTurn key={i} turn={turn} />;
          return <CustomerTurn key={i} turn={turn} />;
        })}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-widest">End of call</span>
          <div className="h-px flex-1 bg-border/40" />
        </div>
      </div>

      {/* Stage badge footer */}
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

export function CompareTranscriptModal({
  open,
  onClose,
  initialStageLeft,
  initialStageRight,
}: CompareTranscriptModalProps) {
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

  useEffect(() => {
    if (open) {
      setLeft({ stageId: initialStageLeft, objectionId: null, failureMode: false });
      setRight({ stageId: initialStageRight, objectionId: null, failureMode: false });
    }
  }, [open, initialStageLeft, initialStageRight]);

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
        {/* Modal Header */}
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

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-border/50 bg-card/20 flex-shrink-0 overflow-x-auto scrollbar-none">
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold flex-shrink-0">Legend</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="text-[7px] font-black text-primary">AI</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Agent turn</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-muted/50 border border-border flex items-center justify-center">
              <span className="text-[7px] font-black text-muted-foreground">C</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Customer turn</span>
          </div>
          {Object.entries(tagColors).slice(0, 6).map(([tag, style]) => (
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

        {/* Two-column area */}
        <div className="flex flex-1 min-h-0 gap-3 p-3 overflow-hidden">
          <TranscriptColumn
            side="left"
            state={left}
            onChange={(next) => setLeft((prev) => ({ ...prev, ...next }))}
          />
          {/* Divider */}
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

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-border/50 bg-card/30">
          <p className="text-[9px] text-muted-foreground/60 text-center">
            Transcripts generated from live stage + objection data · use the selectors in each column to configure independently
          </p>
        </div>
      </div>
    </div>
  );
}
