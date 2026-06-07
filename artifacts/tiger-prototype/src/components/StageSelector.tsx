/**
 * StageSelector.tsx — Left sidebar: journey stage picker and product reference card.
 *
 * Renders the 8 onboarding stages as a vertical timeline with connector lines.
 * The first 7 stages (APPROVED → ACTIVE) form the happy-path column; ESCALATED
 * is shown separately below a divider as the "exception path".
 *
 * Visual conventions:
 *   - Selected stage: filled circle in the stage's colour, card background,
 *     and an expanded description line.
 *   - Unselected stage: hollow circle, muted text, no description.
 *   - Connector lines between stages visualise the sequential journey flow.
 *
 * A static product reference card at the bottom of the panel lists key card terms
 * (fees, cashback rates, VKYC window) so presenters don't need a separate document.
 */
import { STAGES, STAGE_ORDER, type StageId } from "@/data/model";

interface StageSelectorProps {
  selectedStage: StageId;
  onSelectStage: (id: StageId) => void;
}

/**
 * Icon characters for each stage, rendered inside the circular stage indicator.
 * "✓" = completed/approved, "⏳" = pending, "★" = terminal success, "!" = exception.
 */
const stageIcons: Record<StageId, string> = {
  APPROVED: "✓",
  EKYC_PENDING: "⏳",
  EKYC_COMPLETE: "✓",
  VKYC_PENDING: "⏳",
  VKYC_COMPLETE: "✓",
  ACTIVATION_PENDING: "⏳",
  ACTIVE: "★",
  ESCALATED: "!",
};

export function StageSelector({ selectedStage, onSelectStage }: StageSelectorProps) {
  /* Separate the main happy-path stages from the exception path (ESCALATED). */
  const mainPath = STAGE_ORDER.filter((s) => s !== "ESCALATED");
  const escalated = STAGES.find((s) => s.id === "ESCALATED")!;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* Panel header */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Journey stage</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">Pick where the customer is in onboarding (8 stages)</p>
      </div>

      {/* ── Happy-path stage list ─────────────────────────────────────── */}
      <div className="flex flex-col gap-0 relative">
        {mainPath.map((stageId, idx) => {
          const stage = STAGES.find((s) => s.id === stageId)!;
          const isSelected = selectedStage === stageId;
          const isLast = idx === mainPath.length - 1;

          return (
            <div key={stageId} className="relative flex flex-col">
              <button
                type="button"
                onClick={() => onSelectStage(stageId)}
                aria-current={isSelected ? "step" : undefined}
                className={`
                  relative flex items-start gap-3 px-3 py-3 rounded-md text-left transition-colors duration-150 group w-full
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${isSelected
                    ? "bg-card border border-border shadow-sm"
                    : "hover:bg-muted/50 border border-transparent"
                  }
                `}
              >
                <div className="flex flex-col items-center mt-0.5">
                  {/* Stage circle: filled with stage colour when selected, hollow otherwise */}
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all"
                    style={{
                      background: isSelected ? stage.color : "transparent",
                      border: `2px solid ${isSelected ? stage.color : "hsl(215 20% 25%)"}`,
                      color: isSelected ? "#fff" : stage.color,
                    }}
                  >
                    {stageIcons[stageId]}
                  </div>
                  {/* Connector line between consecutive stages — omitted on the last item */}
                  {!isLast && (
                    <div
                      className="w-px mt-1 flex-1 min-h-[16px]"
                      style={{ background: "hsl(215 20% 22%)" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm font-semibold leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {stage.shortLabel}
                    </span>
                    {/* Active indicator dot — coloured in the stage's theme colour */}
                    {isSelected && (
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: stage.color }}
                      />
                    )}
                  </div>
                  {/* Description only renders for the currently selected stage */}
                  {isSelected && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {stage.description}
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Exception path: ESCALATED ────────────────────────────────── */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Exception Path</p>
        <button
          type="button"
          onClick={() => onSelectStage("ESCALATED")}
          aria-current={selectedStage === "ESCALATED" ? "step" : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            ${selectedStage === "ESCALATED"
              ? "bg-card border border-border"
              : "hover:bg-muted/50 border border-transparent"
            }
          `}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{
              background: selectedStage === "ESCALATED" ? escalated.color : "transparent",
              border: `2px solid ${selectedStage === "ESCALATED" ? escalated.color : "hsl(215 20% 25%)"}`,
              color: selectedStage === "ESCALATED" ? "#fff" : escalated.color,
            }}
          >
            !
          </div>
          <div>
            <p className={`text-[12px] font-semibold ${selectedStage === "ESCALATED" ? "text-foreground" : "text-muted-foreground"}`}>
              Escalated
            </p>
            <p className="text-[10px] text-muted-foreground">Human handoff required</p>
          </div>
        </button>
      </div>

      {/* ── Product reference card ───────────────────────────────────── */}
      {/* Static summary of the Tiger Credit Card's key terms — useful during
          live presentations so reviewers can reference product facts without
          switching context. */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Product</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Joining Fee</span>
            <span className="text-foreground font-mono">₹499 one-time</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shopping cashback</span>
            <span className="text-foreground font-mono">10%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Travel cashback</span>
            <span className="text-foreground font-mono">5%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>UPI / other</span>
            <span className="text-foreground font-mono">1%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>VKYC window</span>
            <span className="text-foreground font-mono">9AM–9PM</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Physical card ETA</span>
            <span className="text-foreground font-mono">5–7 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
