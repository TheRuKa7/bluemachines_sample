import { STAGES, STAGE_ORDER, type StageId } from "@/data/model";

interface StageSelectorProps {
  selectedStage: StageId;
  onSelectStage: (id: StageId) => void;
}

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
  const mainPath = STAGE_ORDER.filter((s) => s !== "ESCALATED");
  const escalated = STAGES.find((s) => s.id === "ESCALATED")!;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Journey Stage</p>
        <p className="text-[11px] text-muted-foreground">Select a state to explore the system</p>
      </div>

      <div className="flex flex-col gap-0 relative">
        {mainPath.map((stageId, idx) => {
          const stage = STAGES.find((s) => s.id === stageId)!;
          const isSelected = selectedStage === stageId;
          const isLast = idx === mainPath.length - 1;

          return (
            <div key={stageId} className="relative flex flex-col">
              <button
                onClick={() => onSelectStage(stageId)}
                className={`
                  relative flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 group
                  ${isSelected
                    ? "bg-card border border-border shadow-sm"
                    : "hover:bg-muted/50 border border-transparent"
                  }
                `}
              >
                <div className="flex flex-col items-center mt-0.5">
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
                      className={`text-[12px] font-semibold leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {stage.shortLabel}
                    </span>
                    {isSelected && (
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: stage.color }}
                      />
                    )}
                  </div>
                  {isSelected && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      {stage.description}
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Exception Path</p>
        <button
          onClick={() => onSelectStage("ESCALATED")}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all
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

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Product</p>
        <div className="space-y-1.5 text-[10px] text-muted-foreground">
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
