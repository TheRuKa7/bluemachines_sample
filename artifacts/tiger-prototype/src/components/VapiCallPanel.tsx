import { STAGES, type StageId } from "@/data/model";
import { useVapiCall } from "@/hooks/useVapiCall";

interface VapiCallPanelProps {
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
  open: boolean;
  onClose: () => void;
}

export function VapiCallPanel({
  selectedStage,
  selectedObjection,
  failureMode,
  open,
  onClose,
}: VapiCallPanelProps) {
  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const { status, isSpeaking, transcript, error, startCall, endCall, reset, isActive } =
    useVapiCall(selectedStage, selectedObjection, failureMode);

  if (!open) return null;

  const handleClose = () => {
    if (isActive) endCall();
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isActive) handleClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vapi-call-title"
        className="flex w-full max-w-md flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden max-h-[85vh]"
      >
        <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3">
          <div className="min-w-0">
            <h2 id="vapi-call-title" className="text-sm font-bold">
              Live voice call (VAPI)
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {stage.label}
              {selectedObjection ? " · objection active" : ""}
              {failureMode ? " · failure mode" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close live call panel"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border/60 bg-muted/10">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "active"
                  ? isSpeaking
                    ? "bg-primary animate-pulse"
                    : "bg-green-500"
                  : status === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : status === "error"
                      ? "bg-red-500"
                      : "bg-muted-foreground/40"
              }`}
              aria-hidden
            />
            <span className="text-xs font-medium capitalize">
              {status === "connecting"
                ? "Connecting…"
                : status === "active"
                  ? isSpeaking
                    ? "Agent speaking"
                    : "Listening"
                  : status}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Prompt and context sync from the selected stage, objection, and failure mode. Allow microphone access when prompted.
          </p>
        </div>

        <div className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto px-4 py-3 space-y-2">
          {transcript.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {isActive ? "Waiting for speech…" : "Start a call to talk with Aria using the current prototype context."}
            </p>
          ) : (
            transcript.map((line) => (
              <div
                key={line.id}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  line.role === "user"
                    ? "bg-muted/40 border border-border/60 ml-4"
                    : "bg-primary/10 border border-primary/20 mr-4"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-0.5">
                  {line.role === "user" ? "Customer" : "Aria"}
                </span>
                {line.text}
              </div>
            ))
          )}
        </div>

        {error && (
          <p className="px-4 py-2 text-xs text-red-400 border-t border-red-900/30 bg-red-950/20" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-border px-4 py-3 bg-card/40">
          {!isActive && status !== "connecting" ? (
            <button
              type="button"
              onClick={startCall}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Start call
            </button>
          ) : (
            <button
              type="button"
              onClick={endCall}
              className="flex-1 rounded-md border border-red-800/50 bg-red-950/30 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              End call
            </button>
          )}
          {(status === "ended" || status === "error") && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
