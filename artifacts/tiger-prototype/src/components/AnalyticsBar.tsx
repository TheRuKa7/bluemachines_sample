import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallSession } from "@/context/CallSessionContext";
import { formatAuditTime } from "@/lib/call-audit";
import type { EvalDimension } from "@/lib/call-eval";

type Tab = "metrics" | "audit";

function MetricCell({ metric }: { metric: EvalDimension }) {
  const isGood = metric.pass;
  return (
    <div title={metric.description}>
      <div className="flex items-center gap-1">
        <span
          className={`font-mono text-lg font-semibold tabular-nums ${isGood ? "text-foreground" : "text-amber-700"}`}
        >
          {metric.value}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{metric.label}</span>
    </div>
  );
}

export function AnalyticsBar() {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("metrics");
  const { activeSession, liveEval, clearSession } = useCallSession();

  const hasLiveData = liveEval !== null && activeSession !== null;

  return (
    <footer className="shrink-0 border-t border-border bg-card" aria-label="Live call evaluation">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground">Live eval & audit</span>
          {hasLiveData && (
            <>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  liveEval.overallPass ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                }`}
              >
                {liveEval.overallScore}/5 · {liveEval.disposition.replace(/_/g, " ")}
              </span>
              {activeSession.failureMode && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  Degraded
                </span>
              )}
            </>
          )}
          {!hasLiveData && (
            <span className="text-xs text-muted-foreground">Complete a live call to compute metrics</span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {hasLiveData && (
            <div className="flex gap-1 border-b border-border px-4 pt-2">
              {(["metrics", "audit"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`cursor-pointer rounded-t-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "metrics" ? "Eval metrics" : "Audit log"}
                </button>
              ))}
              <button
                type="button"
                onClick={clearSession}
                className="ml-auto cursor-pointer px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}

          {!hasLiveData && (
            <p className="px-4 py-4 text-sm text-muted-foreground leading-relaxed">
              No call yet. Use Talk to Aria, finish the call, and rate the agent. Scores come from your
              transcript, audit log, and star rating — nothing is preloaded.
            </p>
          )}

          {hasLiveData && tab === "metrics" && (
            <div className="space-y-3 px-4 py-3">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {liveEval.dimensions.map((metric) => (
                  <MetricCell key={metric.key} metric={metric} />
                ))}
              </div>
              {liveEval.signals.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {liveEval.signals.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
              {!activeSession.rating && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
                  CSAT pending — submit your star rating after the call to finalize the score.
                </p>
              )}
            </div>
          )}

          {hasLiveData && tab === "audit" && (
            <div className="max-h-[220px] overflow-y-auto overscroll-contain px-4 py-3 space-y-1.5">
              {activeSession.auditLog.map((ev) => (
                <div
                  key={ev.id}
                  className="flex gap-2 text-xs font-mono border-b border-border/40 pb-1.5 last:border-0"
                >
                  <span className="shrink-0 text-muted-foreground w-[72px]">
                    {formatAuditTime(ev.timestamp)}
                  </span>
                  <span className="shrink-0 w-[140px] sm:w-[160px] text-primary/90 truncate" title={ev.type}>
                    {ev.type}
                  </span>
                  <span className="min-w-0 flex-1 text-foreground/80 break-words">{ev.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
