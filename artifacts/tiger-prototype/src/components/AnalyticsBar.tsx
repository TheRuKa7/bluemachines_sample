import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STAGES, type StageId } from "@/data/model";

interface AnalyticsBarProps {
  selectedStage: StageId;
  failureMode: boolean;
}

type Direction = "up" | "down" | "neutral";

interface Metric {
  label: string;
  value: string;
  direction: Direction;
  description: string;
  good: "up" | "down";
}

function getMetrics(stage: StageId, failureMode: boolean): Metric[] {
  const stageData = STAGES.find((s) => s.id === stage)!;
  const m = stageData.metrics;

  const degradeFactor = failureMode ? 0.75 : 1;
  const escalateFactor = failureMode ? 1.5 : 1;

  const completionRate = Math.round(m.stageCompletionRate * degradeFactor);
  const containmentRate = Math.round(m.containmentRate * degradeFactor);
  const escalationRate = Math.min(100, Math.round(m.escalationRate * escalateFactor));
  const recoveryRate = Math.round(m.dropOffRecoveryRate * degradeFactor);
  const csat = failureMode ? Math.max(1.0, m.csat - 0.7).toFixed(1) : m.csat.toFixed(1);

  const baselineCompletion = 72;
  const baselineContainment = 75;
  const baselineEscalation = 12;
  const baselineRecovery = 48;
  const baselineCsat = 4.0;

  return [
    {
      label: "Stage completion",
      value: `${completionRate}%`,
      direction: completionRate >= baselineCompletion ? "up" : "down",
      description: "% of customers who complete this stage after agent contact",
      good: "up",
    },
    {
      label: "Containment",
      value: `${containmentRate}%`,
      direction: containmentRate >= baselineContainment ? "up" : "down",
      description: "Calls resolved without human handoff",
      good: "up",
    },
    {
      label: "Escalation",
      value: `${escalationRate}%`,
      direction: escalationRate <= baselineEscalation ? "down" : "up",
      description: "% of calls requiring Inside Sales or human intervention",
      good: "down",
    },
    {
      label: "Time to activation",
      value: failureMode ? `~${m.avgTimeToActivation}+` : m.avgTimeToActivation,
      direction: "neutral",
      description: "Average days from this stage to full card activation",
      good: "down",
    },
    {
      label: "Drop-off recovery",
      value: `${recoveryRate}%`,
      direction: recoveryRate >= baselineRecovery ? "up" : "down",
      description: "% of dropped customers successfully recovered by the agent",
      good: "up",
    },
    {
      label: "CSAT",
      value: `${csat}/5`,
      direction: parseFloat(csat as string) >= baselineCsat ? "up" : "down",
      description: "Customer satisfaction score post-interaction",
      good: "up",
    },
  ];
}

function ArrowIcon({ direction, good }: { direction: Direction; good: "up" | "down" }) {
  if (direction === "neutral") {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const isPositive =
    (direction === "up" && good === "up") ||
    (direction === "down" && good === "down");

  const color = isPositive ? "#16a34a" : "#dc2626";
  const rotate = direction === "up" ? "0" : "180";

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnalyticsBar({ selectedStage, failureMode }: AnalyticsBarProps) {
  const [open, setOpen] = useState(true);
  const metrics = getMetrics(selectedStage, failureMode);

  return (
    <footer className="shrink-0 border-t border-border bg-card" aria-label="Evaluation metrics">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Eval metrics</span>
          {failureMode && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Degraded</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-4 border-t border-border px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => {
            const isGood =
              (metric.direction === "up" && metric.good === "up") ||
              (metric.direction === "down" && metric.good === "down") ||
              metric.direction === "neutral";

            return (
              <div key={metric.label} className="cursor-help" title={metric.description}>
                <div className="flex items-center gap-1">
                  <span className={`font-mono text-lg font-semibold tabular-nums ${isGood ? "text-foreground" : "text-red-600"}`}>
                    {metric.value}
                  </span>
                  <ArrowIcon direction={metric.direction} good={metric.good} />
                </div>
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </footer>
  );
}
