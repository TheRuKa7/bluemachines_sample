import { useCallback, useEffect } from "react";
import { OBJECTIONS, STAGES, type StageId } from "@/data/model";
import { useVapiCall } from "@/hooks/useVapiCall";

interface VapiCallPanelProps {
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
  onClose: () => void;
}

export function VapiCallPanel({
  selectedStage,
  selectedObjection,
  failureMode,
  onClose,
}: VapiCallPanelProps) {
  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = selectedObjection
    ? OBJECTIONS.find((o) => o.id === selectedObjection)
    : null;

  const {
    status,
    isSpeaking,
    volumeLevel,
    isMuted,
    transcript,
    error,
    connectStage,
    transcriptEndRef,
    startCall,
    endCall,
    toggleMute,
    reset,
    isActive,
  } = useVapiCall(selectedStage, selectedObjection, failureMode, true);

  const handleClose = useCallback(() => {
    if (isActive) void endCall();
    reset();
    onClose();
  }, [isActive, endCall, reset, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isActive) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, handleClose]);

  const statusLabel =
    status === "connecting"
      ? connectStage
        ? `Connecting (${connectStage})`
        : "Connecting"
      : status === "active"
        ? isMuted
          ? "Mic muted"
          : isSpeaking
            ? "Aria speaking"
            : "Listening"
        : status;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vapi-call-title"
        className="flex w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="vapi-call-title" className="text-base font-bold">
              Talk to Aria
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {stage.label}
              {objection ? ` · ${objection.shortLabel}` : ""}
              {failureMode ? " · failure mode" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={status === "connecting"}
            className="shrink-0 w-9 h-9 cursor-pointer rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            aria-label="Close live call panel"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border/60 bg-muted/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  status === "active"
                    ? isSpeaking
                      ? "bg-primary animate-pulse"
                      : "bg-emerald-500"
                    : status === "connecting"
                      ? "bg-amber-500 animate-pulse"
                      : status === "error"
                        ? "bg-red-500"
                        : "bg-muted-foreground/40"
                }`}
                aria-hidden
              />
              <span className="text-sm font-medium capitalize truncate">{statusLabel}</span>
            </div>
            {isActive && (
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={isMuted}
                className={`shrink-0 cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isMuted
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {isMuted ? "Unmute mic" : "Mute mic"}
              </button>
            )}
          </div>

          {isActive && (
            <div className="space-y-1" aria-label="Agent audio level">
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150"
                  style={{ width: `${Math.round(volumeLevel * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use headphones if you hear echo. Speak clearly after Aria finishes each sentence.
              </p>
            </div>
          )}

          {!isActive && status !== "connecting" && (
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4 leading-relaxed">
              <li>Allow microphone access when the browser asks</li>
              <li>Prompt matches the stage, objection, and failure mode you selected</li>
              <li>Best on Chrome/Edge desktop with speakers or headphones</li>
            </ul>
          )}
        </div>

        <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto px-4 py-3 space-y-2.5">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 leading-relaxed">
              {status === "connecting"
                ? "Setting up audio and connecting to the voice agent…"
                : isActive
                  ? "Listening… say hello or answer Aria's question."
                  : "Press Start call to begin a live onboarding conversation with Aria."}
            </p>
          ) : (
            transcript.map((line) => (
              <div
                key={line.id}
                className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                  line.role === "user"
                    ? "bg-muted/50 border border-border ml-6"
                    : "bg-primary/10 border border-primary/25 mr-6"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                  {line.role === "user" ? "You" : "Aria"}
                </span>
                {line.text}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} aria-hidden />
        </div>

        {error && (
          <p className="border-t border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-border px-4 py-3 bg-card/40">
          {!isActive && status !== "connecting" ? (
            <button
              type="button"
              onClick={startCall}
              className="flex-1 cursor-pointer rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Start call
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void endCall()}
              disabled={status === "connecting"}
              className="flex-1 cursor-pointer rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {status === "connecting" ? "Connecting..." : "End call"}
            </button>
          )}
          {(status === "ended" || status === "error") && (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-md border border-border px-3 py-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
