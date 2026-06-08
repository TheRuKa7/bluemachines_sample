import { Check, Clock, Star, AlertTriangle } from "lucide-react";
import { STAGES, STAGE_ORDER, type StageId } from "@/data/model";

interface StageSelectorProps {
  selectedStage: StageId;
  onSelectStage: (id: StageId) => void;
}

const stageIcons: Record<StageId, typeof Check> = {
  APPROVED: Check,
  EKYC_PENDING: Clock,
  EKYC_COMPLETE: Check,
  VKYC_PENDING: Clock,
  VKYC_COMPLETE: Check,
  ACTIVATION_PENDING: Clock,
  ACTIVE: Star,
  ESCALATED: AlertTriangle,
};

export function StageSelector({ selectedStage, onSelectStage }: StageSelectorProps) {
  const mainPath = STAGE_ORDER.filter((s) => s !== "ESCALATED");
  const escalated = STAGES.find((s) => s.id === "ESCALATED")!;

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-sm font-medium text-foreground">Journey</p>

      <div className="flex flex-col gap-0.5">
        {mainPath.map((stageId) => {
          const stage = STAGES.find((s) => s.id === stageId)!;
          const isSelected = selectedStage === stageId;
          const Icon = stageIcons[stageId];

          return (
            <button
              key={stageId}
              type="button"
              onClick={() => onSelectStage(stageId)}
              aria-current={isSelected ? "step" : undefined}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor: isSelected ? stage.color : "hsl(var(--border))",
                  background: isSelected ? `${stage.color}12` : "transparent",
                  color: isSelected ? stage.color : "hsl(var(--muted-foreground))",
                }}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className={`min-w-0 flex-1 text-sm leading-tight ${isSelected ? "font-semibold" : "font-medium"}`}>
                {stage.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="my-3 border-t border-border" />

      <button
        type="button"
        onClick={() => onSelectStage("ESCALATED")}
        aria-current={selectedStage === "ESCALATED" ? "step" : undefined}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selectedStage === "ESCALATED"
            ? "bg-red-50 text-red-800"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
          style={{
            borderColor: selectedStage === "ESCALATED" ? escalated.color : "hsl(var(--border))",
            background: selectedStage === "ESCALATED" ? `${escalated.color}12` : "transparent",
            color: selectedStage === "ESCALATED" ? escalated.color : "hsl(var(--muted-foreground))",
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-sm font-medium">Escalated</span>
      </button>
    </div>
  );
}
