import { useMemo, useState } from "react";
import { StageSelector } from "@/components/StageSelector";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";
import { AgentPanel } from "@/components/AgentPanel";
import { AnalyticsBar } from "@/components/AnalyticsBar";
import { CallTranscriptModal } from "@/components/CallTranscriptModal";
import { VapiCallPanel } from "@/components/VapiCallPanel";
import { WorkflowGuide } from "@/components/WorkflowGuide";
import { LiveContextBar } from "@/components/LiveContextBar";
import { OBJECTIONS, type StageId } from "@/data/model";

function deriveWorkflowStep(
  selectedObjection: string | null,
  failureMode: boolean,
  transcriptOpen: boolean,
  liveCallOpen: boolean,
): 1 | 2 | 3 | 4 {
  if (selectedObjection || failureMode || transcriptOpen || liveCallOpen) return 4;
  return 2;
}

export default function App() {
  const [selectedStage, setSelectedStage] = useState<StageId>("APPROVED");
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [failureMode, setFailureMode] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [liveCallOpen, setLiveCallOpen] = useState(false);

  const workflowStep = useMemo(
    () => deriveWorkflowStep(selectedObjection, failureMode, transcriptOpen, liveCallOpen),
    [selectedObjection, failureMode, transcriptOpen, liveCallOpen],
  );

  const handleObjectionClick = (id: string) => {
    setSelectedObjection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex-shrink-0 border-b border-border bg-card/70 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10"
              aria-hidden
            >
              <span className="text-xs font-black text-primary">TC</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight sm:text-base">
                Tiger Credit Card — Onboarding Voice Agent
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed max-w-xl">
                System design + live VAPI voice agent — data flow, prompts, objections, eval metrics
                (Blue Machines assignment)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLiveCallOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden />
              Talk to Aria (live)
            </button>
            <button
              type="button"
              onClick={() => setTranscriptOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-haspopup="dialog"
            >
              View call flow
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={failureMode}
              onClick={() => setFailureMode((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                failureMode
                  ? "border-red-800/60 bg-red-950/40 text-red-300"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${failureMode ? "bg-red-500 animate-pulse" : "bg-muted-foreground/50"}`}
                aria-hidden
              />
              {failureMode ? "Failure mode on" : "Simulate failure"}
            </button>
          </div>
        </div>
      </header>

      <WorkflowGuide step={workflowStep} />
      <LiveContextBar
        selectedStage={selectedStage}
        selectedObjection={selectedObjection}
        failureMode={failureMode}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row overflow-hidden">
        <aside
          className="w-full lg:w-[240px] shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/25 px-4 py-4 overflow-y-auto"
          aria-label="Customer journey stages"
        >
          <StageSelector selectedStage={selectedStage} onSelectStage={setSelectedStage} />
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="System interaction flow">
          <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-hidden">
            <SystemFlowDiagram selectedStage={selectedStage} failureMode={failureMode} />
          </div>

          <section
            className="shrink-0 border-t border-border bg-card/30 px-4 py-3"
            aria-label="Customer objection scenarios"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Objection scenarios (assignment)
              </h2>
              {selectedObjection && (
                <button
                  type="button"
                  onClick={() => setSelectedObjection(null)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select objection">
              {OBJECTIONS.map((obj) => (
                <button
                  key={obj.id}
                  type="button"
                  aria-pressed={selectedObjection === obj.id}
                  onClick={() => handleObjectionClick(obj.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedObjection === obj.id
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                      : "border-border bg-background/50 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {obj.shortLabel}
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside
          className="w-full lg:w-[380px] xl:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-card/20 overflow-hidden flex flex-col min-h-[300px] lg:min-h-0"
          aria-label="Agent logic and prompt"
        >
          <AgentPanel
            selectedStage={selectedStage}
            selectedObjection={selectedObjection}
            failureMode={failureMode}
          />
        </aside>
      </div>

      <AnalyticsBar selectedStage={selectedStage} failureMode={failureMode} />

      <CallTranscriptModal
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        selectedStage={selectedStage}
        selectedObjection={selectedObjection}
        failureMode={failureMode}
      />

      {liveCallOpen && (
        <VapiCallPanel
          onClose={() => setLiveCallOpen(false)}
          selectedStage={selectedStage}
          selectedObjection={selectedObjection}
          failureMode={failureMode}
        />
      )}
    </div>
  );
}
