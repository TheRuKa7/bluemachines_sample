import { useEffect, useRef } from "react";
import { generateTranscript, type TranscriptTurn } from "@/data/transcript";
import { STAGES, OBJECTIONS, type StageId } from "@/data/model";

interface CallTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
}

const tagColors: Record<string, { bg: string; text: string; border: string }> = {
  "CRM READ":             { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "CRM WRITE":            { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  "eKYC READ":            { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "eKYC WRITE":           { bg: "rgba(34,197,94,0.10)",  text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  "VKYC READ":            { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "VKYC WRITE":           { bg: "rgba(16,185,129,0.10)", text: "#34d399", border: "rgba(16,185,129,0.25)" },
  "ACTIVATION READ":      { bg: "rgba(168,85,247,0.10)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  "CARD CORE READ":       { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  "NOTIFY":               { bg: "rgba(245,158,11,0.10)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  "COMPLIANCE WRITE":     { bg: "rgba(249,115,22,0.10)", text: "#fb923c", border: "rgba(249,115,22,0.25)" },
  "ANALYTICS WRITE":      { bg: "rgba(6,182,212,0.10)",  text: "#22d3ee", border: "rgba(6,182,212,0.25)" },
  "INSIDE SALES ESCALATE":{ bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "INSIDE SALES NOTIFY":  { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.25)" },
  "FAILURE":              { bg: "rgba(239,68,68,0.15)",  text: "#ef4444", border: "rgba(239,68,68,0.40)" },
};

function getTagStyle(tag: string) {
  return tagColors[tag] ?? { bg: "rgba(100,100,100,0.10)", text: "#9ca3af", border: "rgba(100,100,100,0.25)" };
}

function SystemTurn({ turn }: { turn: TranscriptTurn }) {
  const style = turn.systemTag ? getTagStyle(turn.systemTag) : getTagStyle("");
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-1 flex items-center gap-2">
        <div
          className="h-px flex-1 opacity-30"
          style={{ background: style.text }}
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {turn.systemTag && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono"
              style={{
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
              }}
            >
              {turn.systemTag}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/70 italic">{turn.text}</span>
        </div>
        <div
          className="h-px flex-1 opacity-30"
          style={{ background: style.text }}
        />
      </div>
    </div>
  );
}

function AgentTurn({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <span className="text-[9px] font-black text-primary">AI</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-primary/70 font-semibold mb-1">Agent · Aria</div>
        <div className="bg-primary/8 border border-primary/15 rounded-lg rounded-tl-none px-3 py-2">
          <p className="text-[12px] text-foreground/90 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

function CustomerTurn({ turn }: { turn: TranscriptTurn }) {
  return (
    <div className="flex gap-2.5 items-start flex-row-reverse">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-muted/50 border border-border flex items-center justify-center">
          <span className="text-[9px] font-black text-muted-foreground">C</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Customer · Priya</div>
        <div className="bg-muted/30 border border-border/60 rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
          <p className="text-[12px] text-foreground/80 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

export function CallTranscriptModal({
  open,
  onClose,
  selectedStage,
  selectedObjection,
  failureMode,
}: CallTranscriptModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = selectedObjection ? OBJECTIONS.find((o) => o.id === selectedObjection) ?? null : null;

  const turns = generateTranscript(selectedStage, selectedObjection, failureMode);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, selectedStage, selectedObjection, failureMode]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        style={{ width: "min(700px, 96vw)", height: "min(82vh, 780px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                Simulated Call Transcript
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{
                background: `${stage.color}15`,
                color: stage.color,
                border: `1px solid ${stage.color}30`,
              }}
            >
              {stage.label}
            </span>
            {objection && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                  Objection: {objection.shortLabel}
                </span>
              </>
            )}
            {failureMode && (
              <>
                <div className="w-px h-4 bg-border" />
                <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  Failure Mode
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-lg leading-none"
            aria-label="Close transcript"
          >
            ×
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-border/50 bg-card/30 flex-shrink-0 overflow-x-auto scrollbar-none">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex-shrink-0">Legend</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="text-[7px] font-black text-primary">AI</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Agent turn</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-4 h-4 rounded-full bg-muted/50 border border-border flex items-center justify-center">
              <span className="text-[7px] font-black text-muted-foreground">C</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Customer turn</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono"
              style={{ background: "rgba(6,182,212,0.10)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.25)" }}
            >
              SYS EVENT
            </span>
            <span className="text-[10px] text-muted-foreground">System annotation</span>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {turns.map((turn, i) => {
            if (turn.role === "system") return <SystemTurn key={i} turn={turn} />;
            if (turn.role === "agent") return <AgentTurn key={i} turn={turn} />;
            return <CustomerTurn key={i} turn={turn} />;
          })}

          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">End of call</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
        </div>

        {/* Footer note */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-border/50 bg-card/30">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Transcript is generated from live stage + objection data · changes dynamically with stage and objection selection
          </p>
        </div>
      </div>
    </div>
  );
}
