/**
 * CallTranscriptModal.tsx — Simulated call transcript viewer with step-by-step playback.
 *
 * Displays a generated transcript for the selected stage / objection / failure-mode
 * combination. The transcript is produced entirely in-memory by `generateTranscript()`
 * in `transcript.ts` — there is no network request.
 *
 * Turn types and their visual treatment:
 *   - "agent"    : blue AI avatar bubble, left-aligned
 *   - "customer" : grey "C" avatar bubble, right-aligned (Customer · Priya)
 *   - "system"   : centred horizontal rule with a coloured system-tag chip
 *                  and an italic data-annotation line
 *   - "thinking" : dimmed indigo dashed box with an "Agent Reasoning" badge;
 *                  labelled "internal · not spoken" to signal it is not part
 *                  of the actual call audio
 *
 * Playback controls:
 *   - Play / Pause   : advances turns on an interval; interval ms set by speed selector
 *   - Step ← / →     : moves one turn forward or backward
 *   - Speed selector  : 0.5× (2400 ms), 1× (1400 ms), 2× (700 ms) per turn
 *   - Show all        : exits playback mode and shows the full transcript at once
 *   - Replay          : resets to turn 0 and starts playing again
 *
 * Keyboard shortcuts (active when the modal is open):
 *   Space   → play / pause
 *   ←       → step back
 *   →       → step forward
 *   Escape  → close modal
 *
 * The progress bar uses three colours:
 *   - Indigo  : actively playing
 *   - Darker indigo : paused mid-transcript
 *   - Green  : reached the end of the transcript
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { generateTranscript, type TranscriptTurn } from "@/data/transcript";
import { STAGES, OBJECTIONS, type StageId } from "@/data/model";

interface CallTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   System-tag colour map
   Maps the systemTag string (e.g. "CRM READ") to background / text / border colours.
   Unknown tags fall back to a neutral grey style via getTagStyle().
   ───────────────────────────────────────────────────────────────────────────── */
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

/** Returns the colour style for a given tag string, defaulting to neutral grey. */
function getTagStyle(tag: string) {
  return tagColors[tag] ?? { bg: "rgba(100,100,100,0.10)", text: "#9ca3af", border: "rgba(100,100,100,0.25)" };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Turn renderers
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * System event turn — a horizontal separator with a coloured system-tag chip
 * and an italic annotation line below (e.g. field values loaded from the system).
 * When `isNew` is true during playback, a flash animation highlights the new turn.
 */
function SystemTurn({ turn, isNew }: { turn: TranscriptTurn; isNew?: boolean }) {
  const style = turn.systemTag ? getTagStyle(turn.systemTag) : getTagStyle("");
  return (
    <div
      className="flex items-start gap-2 py-1.5"
      style={isNew ? { animation: "turnFlash 0.55s ease-out" } : undefined}
    >
      <div className="flex-1 flex items-center gap-2">
        <div className="h-px flex-1 opacity-30" style={{ background: style.text }} />
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
        <div className="h-px flex-1 opacity-30" style={{ background: style.text }} />
      </div>
    </div>
  );
}

/** Agent dialogue turn — left-aligned with an "AI" avatar and indigo bubble. */
function AgentTurn({ turn, isNew }: { turn: TranscriptTurn; isNew?: boolean }) {
  return (
    <div
      className="flex gap-2.5 items-start"
      style={isNew ? { animation: "turnEnter 0.35s ease-out" } : undefined}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
          <span className="text-[9px] font-black text-primary">AI</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-primary/70 font-semibold mb-1">Agent · Aria</div>
        <div className="rounded-lg rounded-tl-none border border-primary/20 bg-primary/10 px-3 py-2">
          <p className="text-sm text-foreground/90 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Agent reasoning turn — shows the agent's internal decision logic before
 * a spoken response. Not part of the actual voice call; visually demarcated
 * with a dashed indigo border, dimmed text, and an "internal · not spoken" label.
 */
function ThinkingTurn({ turn, isNew }: { turn: TranscriptTurn; isNew?: boolean }) {
  return (
    <div
      className="flex gap-2.5 items-start"
      style={isNew ? { animation: "turnEnter 0.35s ease-out" } : undefined}
    >
      <div className="flex-shrink-0 mt-0.5 w-6 flex justify-center">
        {/* Small info icon instead of the AI avatar circle */}
        <div className="flex h-4 w-4 items-center justify-center rounded border border-primary/25 bg-primary/10">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
            <circle cx="4" cy="4" r="3" stroke="hsl(var(--primary))" strokeWidth="1"/>
            <path d="M4 2.5V4.5M4 5.5V5.5" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-primary">
            Agent Reasoning
          </span>
          <span className="text-[8px] italic text-muted-foreground">internal, not spoken</span>
        </div>
        <div className="rounded-lg border border-dashed border-primary/25 bg-muted/40 px-3 py-2">
          <p className="text-[11px] italic leading-relaxed text-muted-foreground">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

/** Customer dialogue turn — right-aligned with a "C" avatar and a muted grey bubble. */
function CustomerTurn({ turn, isNew }: { turn: TranscriptTurn; isNew?: boolean }) {
  return (
    <div
      className="flex gap-2.5 items-start flex-row-reverse"
      style={isNew ? { animation: "turnEnter 0.35s ease-out" } : undefined}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-6 h-6 rounded-full bg-muted/50 border border-border flex items-center justify-center">
          <span className="text-[9px] font-black text-muted-foreground">C</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Customer · Priya</div>
        <div className="bg-muted/30 border border-border/60 rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
          <p className="text-sm text-foreground/80 leading-relaxed">{turn.text}</p>
        </div>
      </div>
    </div>
  );
}

const PLAYBACK_MS_PER_TURN = 1400;

/* ─────────────────────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────────────────────── */

export function CallTranscriptModal({
  open,
  onClose,
  selectedStage,
  selectedObjection,
  failureMode,
}: CallTranscriptModalProps) {
  useScrollLock(open);

  /** Ref to the scrollable transcript container — used for auto-scroll during playback. */
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Ref to the active setInterval timer so it can be cancelled on pause / unmount. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = selectedObjection ? OBJECTIONS.find((o) => o.id === selectedObjection) ?? null : null;

  /** Full generated transcript for the current combination of stage / objection / failure. */
  const turns = generateTranscript(selectedStage, selectedObjection, failureMode);
  const totalTurns = turns.length;

  /** Whether the user has entered playback mode (sequential reveal). */
  const [playbackMode, setPlaybackMode] = useState(false);
  /** Number of turns currently visible in playback mode (0 = none shown yet). */
  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  /** True when all turns have been revealed. */
  const isAtEnd = visibleCount >= totalTurns;

  /** Clears the active setInterval if one is running. */
  const clearPlayInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /* Reset playback state whenever the modal opens or its key inputs change. */
  useEffect(() => {
    if (open) {
      setPlaybackMode(false);
      setIsPlaying(false);
      setVisibleCount(0);
      clearPlayInterval();
    }
  }, [open, selectedStage, selectedObjection, failureMode, clearPlayInterval]);

  /* Clean up the interval when the modal closes. */
  useEffect(() => {
    if (!open) {
      clearPlayInterval();
      setIsPlaying(false);
    }
  }, [open, clearPlayInterval]);

  /* Start / stop the auto-advance interval whenever isPlaying or speed changes. */
  useEffect(() => {
    clearPlayInterval();
    if (!isPlaying || !playbackMode) return;
    intervalRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= totalTurns) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, PLAYBACK_MS_PER_TURN);
    return clearPlayInterval;
  }, [isPlaying, playbackMode, totalTurns, clearPlayInterval]);

  /* Auto-scroll to the bottom of the transcript as new turns are revealed. */
  useEffect(() => {
    if (playbackMode && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount, playbackMode]);

  /** Enters playback mode and starts playing from the current position (or from 0 if at end). */
  const startPlayback = useCallback(() => {
    setPlaybackMode(true);
    setVisibleCount((prev) => (prev >= totalTurns ? 0 : prev));
    setIsPlaying(true);
  }, [totalTurns]);

  /**
   * Main play/pause toggle:
   *   - If not in playback mode → start playback from 0.
   *   - If at end → replay from 0.
   *   - Otherwise → toggle isPlaying.
   */
  const togglePlay = useCallback(() => {
    if (!playbackMode) {
      startPlayback();
    } else if (isAtEnd) {
      setVisibleCount(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [playbackMode, isAtEnd, startPlayback]);

  /** Advances one turn forward (pauses if playing). */
  const stepForward = useCallback(() => {
    setIsPlaying(false);
    if (!playbackMode) {
      setPlaybackMode(true);
      setVisibleCount(1);
    } else {
      setVisibleCount((prev) => Math.min(prev + 1, totalTurns));
    }
  }, [playbackMode, totalTurns]);

  /** Steps one turn back (pauses if playing). */
  const stepBack = useCallback(() => {
    setIsPlaying(false);
    if (!playbackMode) return;
    setVisibleCount((prev) => Math.max(prev - 1, 0));
  }, [playbackMode]);

  /** Exits playback mode entirely, showing the full transcript and scrolling to top. */
  const exitPlayback = useCallback(() => {
    setPlaybackMode(false);
    setIsPlaying(false);
    clearPlayInterval();
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [clearPlayInterval]);

  /* Register keyboard shortcuts while the modal is open. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") stepForward();
      if (e.key === "ArrowLeft") stepBack();
      if (e.key === " ") {
        e.preventDefault(); // prevent page scroll
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, stepForward, stepBack, togglePlay]);

  /* Early return — modal renders nothing when closed. */
  if (!open) return null;

  /* In playback mode only show the turns up to visibleCount; otherwise show all. */
  const visibleTurns = playbackMode ? turns.slice(0, visibleCount) : turns;
  /* Progress bar fill (0–1). Always 1 when not in playback mode. */
  const progress = totalTurns > 0 ? (playbackMode ? visibleCount / totalTurns : 1) : 0;

  return (
    <>
      {/* Keyframe animations injected inline to avoid global CSS pollution. */}
      <style>{`
        @keyframes turnEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes turnFlash {
          0%   { opacity: 0; background: hsl(var(--primary) / 0.15); }
          40%  { opacity: 1; background: hsl(var(--primary) / 0.1); }
          100% { background: transparent; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="call-flow-title"
          className="relative flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden w-full max-w-2xl h-[min(82vh,780px)]"
        >
          {/* ── Modal header ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-b border-border bg-card/60">
            {/* Title row: transcript label + stage badge + optional objection/failure badges */}
            <div className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span id="call-flow-title" className="text-sm font-semibold text-foreground">
                    Call flow
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: `${stage.color}14`,
                      color: stage.color,
                      border: `1px solid ${stage.color}30`,
                    }}
                  >
                    {stage.shortLabel}
                  </span>
                  {objection && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      {objection.shortLabel}
                    </span>
                  )}
                  {failureMode && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Failure mode
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close call flow"
              >
                ×
              </button>
            </div>

            {/* ── Playback controls row ──────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 pb-3">
              {/* Play / Pause / Replay button — label changes based on playback state */}
              <button
                type="button"
                onClick={togglePlay}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isPlaying
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-primary/25 bg-primary/10 text-primary"
                }`}
                title="Play / Pause (Space)"
              >
                {isPlaying ? (
                  /* Pause icon */
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1.5" y="1" width="2.5" height="8" rx="0.5"/>
                    <rect x="6" y="1" width="2.5" height="8" rx="0.5"/>
                  </svg>
                ) : (
                  /* Play icon */
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M2 1.5L9 5L2 8.5V1.5Z"/>
                  </svg>
                )}
                {isPlaying ? "Pause" : isAtEnd && playbackMode ? "Replay" : "Play"}
              </button>

              {/* Step back one turn */}
              <button
                onClick={stepBack}
                disabled={!playbackMode || visibleCount === 0}
                className="w-7 h-7 rounded flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9ca3af" }}
                title="Step back (←)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M8 1.5L1 5L8 8.5V1.5Z"/>
                </svg>
              </button>

              {/* Step forward one turn */}
              <button
                onClick={stepForward}
                disabled={playbackMode && isAtEnd}
                className="w-7 h-7 rounded flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#9ca3af" }}
                title="Step forward (→)"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1.5L9 5L2 8.5V1.5Z"/>
                </svg>
              </button>

              {/* Turn counter */}
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {playbackMode ? `${visibleCount} / ${totalTurns} turns` : `${totalTurns} turns`}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress * 100}%`,
                    background: progress === 1 ? "#16a34a" : "hsl(var(--primary))",
                  }}
                />
              </div>

              {playbackMode ? (
                <button
                  type="button"
                  onClick={exitPlayback}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  Show full transcript
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startPlayback}
                  className="text-[11px] text-primary hover:text-primary/90 transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  Animate step-by-step
                </button>
              )}
            </div>

            {/* Keyboard shortcut hint — only shown while in playback mode */}
            {playbackMode && (
              <div className="px-5 pb-2 flex items-center gap-3">
                <span className="text-[9px] text-muted-foreground/40">
                  <kbd className="font-mono bg-muted/20 border border-border/30 rounded px-1 py-0 text-[8px]">Space</kbd> play/pause
                  <span className="mx-1.5 opacity-30">·</span>
                  <kbd className="font-mono bg-muted/20 border border-border/30 rounded px-1 py-0 text-[8px]">←</kbd><kbd className="font-mono bg-muted/20 border border-border/30 rounded px-1 py-0 text-[8px]">→</kbd> step
                </span>
              </div>
            )}
          </div>

          {/* ── Turn-type legend ──────────────────────────────────────── */}
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="rounded border border-dashed border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                REASONING
              </span>
              <span className="text-[10px] text-muted-foreground">Agent internal logic</span>
            </div>
          </div>

          {/* ── Transcript scroll area ───────────────────────────────── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {/* Empty state — shown at the start of playback before Play is pressed */}
            {visibleTurns.length === 0 && playbackMode ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
                  <circle cx="16" cy="16" r="14" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <path d="M12 10L22 16L12 22V10Z" fill="hsl(var(--primary))"/>
                </svg>
                <p className="text-[11px] text-muted-foreground">Press Play to start the call</p>
              </div>
            ) : (
              /* Render each visible turn with the appropriate component.
                 The most recently revealed turn (last index) receives isNew=true
                 during playback so the entry/flash animation fires. */
              visibleTurns.map((turn, i) => {
                const isNew = playbackMode && i === visibleCount - 1;
                if (turn.role === "system") return <SystemTurn key={i} turn={turn} isNew={isNew} />;
                if (turn.role === "agent") return <AgentTurn key={i} turn={turn} isNew={isNew} />;
                if (turn.role === "thinking") return <ThinkingTurn key={i} turn={turn} isNew={isNew} />;
                return <CustomerTurn key={i} turn={turn} isNew={isNew} />;
              })
            )}

            {/* "End of call" divider — only shown when the transcript is fully visible */}
            {(!playbackMode || isAtEnd) && visibleTurns.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">End of call</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
            )}
          </div>

          {/* ── Modal footer ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-5 py-2 border-t border-border/50 bg-card/30">
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              System annotations show data flow during the call · updates when you change stage, objection, or failure mode
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
