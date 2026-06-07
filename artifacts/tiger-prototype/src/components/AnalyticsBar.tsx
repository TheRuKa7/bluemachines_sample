/**
 * AnalyticsBar.tsx — Simulated eval-metrics strip pinned to the bottom of the screen.
 *
 * Displays six KPI tiles derived from the selected stage's `metrics` object in model.ts.
 * When `failureMode` is active, each metric is degraded by a preset factor to simulate
 * reduced performance during system outages:
 *   - Completion / Containment / Recovery rates are multiplied by 0.75
 *   - Escalation rate is multiplied by 1.5 (capped at 100)
 *   - CSAT is reduced by 0.7 points (clamped at 1.0)
 *   - Avg time-to-activation shows a "+" suffix to indicate degradation
 *
 * Each tile compares its computed value against a fixed cross-stage baseline and
 * renders a coloured arrow (green = good direction, red = bad direction).
 */
import { STAGES, type StageId } from "@/data/model";

interface AnalyticsBarProps {
  selectedStage: StageId;
  failureMode: boolean;
}

/** Which direction a metric is currently trending. */
type Direction = "up" | "down" | "neutral";

/** A single KPI tile's data shape. */
interface Metric {
  label: string;
  value: string;
  direction: Direction;
  description: string;
  /** Whether "up" or "down" is the positive direction for this metric. */
  good: "up" | "down";
}

/**
 * Derives the six eval metrics for the given stage, optionally degraded for failure mode.
 *
 * Baseline thresholds are hardcoded cross-stage averages used to determine the
 * arrow direction (above baseline = "up", below = "down").
 */
function getMetrics(stage: StageId, failureMode: boolean): Metric[] {
  const stageData = STAGES.find((s) => s.id === stage)!;
  const m = stageData.metrics;

  /* Degradation multipliers: normal mode = identity, failure mode = penalty. */
  const degradeFactor = failureMode ? 0.75 : 1;
  const escalateFactor = failureMode ? 1.5 : 1;

  const completionRate = Math.round(m.stageCompletionRate * degradeFactor);
  const containmentRate = Math.round(m.containmentRate * degradeFactor);
  const escalationRate = Math.min(100, Math.round(m.escalationRate * escalateFactor));
  const recoveryRate = Math.round(m.dropOffRecoveryRate * degradeFactor);
  const csat = failureMode ? Math.max(1.0, m.csat - 0.7).toFixed(1) : m.csat.toFixed(1);

  /* Cross-stage baseline values used to colour the trend arrow. */
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
      /* Escalation is "down is good" — lower escalation = better performance. */
      direction: escalationRate <= baselineEscalation ? "down" : "up",
      description: "% of calls requiring Inside Sales or human intervention",
      good: "down",
    },
    {
      label: "Avg to Activation",
      /* In failure mode, suffix a "+" to signal the estimate is unreliable. */
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

/**
 * Small SVG arrow icon used inside metric tiles.
 * Colour is determined by whether the direction is the "good" direction for that metric.
 * Neutral metrics show a dash instead.
 */
function ArrowIcon({ direction, good }: { direction: Direction; good: "up" | "down" }) {
  if (direction === "neutral") {
    return <span className="text-muted-foreground text-xs">–</span>;
  }

  const isPositive =
    (direction === "up" && good === "up") ||
    (direction === "down" && good === "down");

  const color = isPositive ? "#22c55e" : "#ef4444";
  /* The base path points up; rotating 180° flips it for "down" arrows. */
  const rotate = direction === "up" ? "0" : "180";

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Renders the full six-tile eval metrics footer strip. */
export function AnalyticsBar({ selectedStage, failureMode }: AnalyticsBarProps) {
  const metrics = getMetrics(selectedStage, failureMode);

  return (
    <footer className="border-t border-border bg-card/50 px-4 py-3" aria-label="Evaluation metrics">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evaluation metrics (Task 2)</p>
        <span className="text-[11px] text-muted-foreground">Simulated KPIs for this stage</span>
        {failureMode && (
          <span className="ml-auto text-[11px] text-red-400 font-semibold uppercase tracking-wide">Degraded</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </footer>
  );
}

/**
 * Single KPI tile.
 * - The value is coloured red when the metric is trending in the wrong direction.
 * - A native `title` tooltip surfaces the full metric description on hover.
 */
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
          className={`text-lg font-bold font-mono tabular-nums leading-none ${
            isGood ? "text-foreground" : "text-red-400"
          }`}
        >
          {metric.value}
        </span>
        <ArrowIcon direction={metric.direction} good={metric.good} />
      </div>
      <span className="text-[11px] text-muted-foreground leading-snug">{metric.label}</span>
    </div>
  );
}
