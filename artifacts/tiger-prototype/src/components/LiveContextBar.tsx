import { OBJECTIONS, STAGES, type StageId } from "@/data/model";

interface LiveContextBarProps {
  selectedStage: StageId;
  selectedObjection: string | null;
  failureMode: boolean;
}

export function LiveContextBar({ selectedStage, selectedObjection, failureMode }: LiveContextBarProps) {
  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = selectedObjection ? OBJECTIONS.find((o) => o.id === selectedObjection) : null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60 bg-card/40 text-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live context</span>
      <span
        className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold"
        style={{ background: `${stage.color}18`, color: stage.color, border: `1px solid ${stage.color}35` }}
      >
        {stage.label}
      </span>
      {objection && (
        <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/30">
          Objection: {objection.shortLabel}
        </span>
      )}
      {failureMode && (
        <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-red-950/50 text-red-300 border border-red-800/50">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
          System failure simulation
        </span>
      )}
      {!objection && !failureMode && (
        <span className="text-xs text-muted-foreground">Select an objection or toggle failure mode to explore edge cases</span>
      )}
    </div>
  );
}
