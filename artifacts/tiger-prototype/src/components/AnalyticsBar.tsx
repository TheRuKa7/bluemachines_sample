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
      label: "Stage Completion",
      value: `${completionRate}%`,
      direction: completionRate >= baselineCompletion ? "up" : "down",
      description: "% of customers who complete this stage after agent contact",
      good: "up",
    },
    {
      label: "Containment Rate",
      value: `${containmentRate}%`,
      direction: containmentRate >= baselineContainment ? "up" : "down",
      description: "Calls resolved without human handoff",
      good: "up",
    },
    {
      label: "Escalation Rate",
      value: `${escalationRate}%`,
      direction: escalationRate <= baselineEscalation ? "down" : "up",
      description: "% of calls requiring Inside Sales or human intervention",
      good: "down",
    },
    {
      label: "Avg to Activation",
      value: failureMode ? `~${m.avgTimeToActivation}+` : m.avgTimeToActivation,
      direction: "neutral",
      description: "Average days from this stage to full card activation",
      good: "down",
    },
    {
      label: "Drop-off Recovery",
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
    return <span className="text-muted-foreground text-xs">–</span>;
  }

  const isPositive =
    (direction === "up" && good === "up") ||
    (direction === "down" && good === "down");

  const color = isPositive ? "#22c55e" : "#ef4444";
  const rotate = direction === "up" ? "0" : "180";

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnalyticsBar({ selectedStage, failureMode }: AnalyticsBarProps) {
  const metrics = getMetrics(selectedStage, failureMode);

  return (
    <div className="border-t border-border bg-card/50 px-4 py-2.5">
      <div className="flex items-center gap-1 mb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Eval Metrics</p>
        <span className="text-[9px] text-muted-foreground">— simulated values for this stage</span>
        {failureMode && (
          <span className="ml-auto text-[9px] text-red-400 font-semibold uppercase tracking-wider">Degraded</span>
        )}
      </div>
      <div className="grid grid-cols-6 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const isGood =
    (metric.direction === "up" && metric.good === "up") ||
    (metric.direction === "down" && metric.good === "down") ||
    metric.direction === "neutral";

  return (
    <div
      className="flex flex-col gap-0.5 group relative cursor-help"
      title={metric.description}
    >
      <div className="flex items-center gap-1">
        <span
          className={`text-[15px] font-bold font-mono tabular-nums leading-none ${
            isGood ? "text-foreground" : "text-red-400"
          }`}
        >
          {metric.value}
        </span>
        <ArrowIcon direction={metric.direction} good={metric.good} />
      </div>
      <span className="text-[9px] text-muted-foreground leading-tight">{metric.label}</span>
    </div>
  );
}
