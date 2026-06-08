import { useMemo, useState } from "react";
import { Mic, FileText, AlertTriangle } from "lucide-react";
import { StageSelector } from "@/components/StageSelector";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";
import { AgentPanel } from "@/components/AgentPanel";
import { AnalyticsBar } from "@/components/AnalyticsBar";
import { CallTranscriptModal } from "@/components/CallTranscriptModal";
import { VapiCallPanel } from "@/components/VapiCallPanel";
import { WorkflowGuide } from "@/components/WorkflowGuide";
import { OBJECTIONS, STAGES, type StageId } from "@/data/model";

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

  const stage = STAGES.find((s) => s.id === selectedStage)!;
  const objection = selectedObjection ? OBJECTIONS.find((o) => o.id === selectedObjection) : null;

  const workflowStep = useMemo(
    () => deriveWorkflowStep(selectedObjection, failureMode, transcriptOpen, liveCallOpen),
    [selectedObjection, failureMode, transcriptOpen, liveCallOpen],
  );

  const handleObjectionClick = (id: string) => {
    setSelectedObjection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:max-h-dvh lg:overflow-hidden pb-[env(safe-area-inset-bottom)]">
      <header className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
                aria-hidden
              >
                TC
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold leading-tight sm:text-lg">
                  Tiger Credit Card Onboarding
                </h1>
                <p className="text-sm text-muted-foreground">Voice agent system design prototype</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <span
                className="chip border-transparent"
                style={{ background: `${stage.color}14`, color: stage.color, borderColor: `${stage.color}30` }}
              >
                {stage.shortLabel}
              </span>
              {objection && (
                <span className="chip border-amber-200 bg-amber-50 text-amber-800">
                  {objection.shortLabel}
                </span>
              )}
              {failureMode && (
                <span className="chip border-red-200 bg-red-50 text-red-700">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Failure mode
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <WorkflowGuide step={workflowStep} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setLiveCallOpen(true)} className="btn-primary">
                <Mic className="h-4 w-4" aria-hidden />
                Talk to Aria
              </button>
              <button
                type="button"
                onClick={() => setTranscriptOpen(true)}
                className="btn-secondary"
                aria-haspopup="dialog"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Call flow
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={failureMode}
                onClick={() => setFailureMode((v) => !v)}
                className={`btn-secondary ${failureMode ? "border-red-200 bg-red-50 text-red-700" : ""}`}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {failureMode ? "Failure on" : "Failure off"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 sm:p-4 lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <aside
          className="panel w-full shrink-0 p-3 lg:w-[220px] xl:w-[240px] lg:overflow-y-auto lg:overscroll-contain"
          aria-label="Customer journey stages"
        >
          <StageSelector selectedStage={selectedStage} onSelectStage={setSelectedStage} />
        </aside>

        <main
          className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
          aria-label="System interaction flow"
        >
          <div className="panel flex min-h-[240px] flex-col p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
            <SystemFlowDiagram selectedStage={selectedStage} failureMode={failureMode} />
          </div>

          <section className="panel shrink-0 px-3 py-3 sm:px-4" aria-label="Objection scenarios">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">Objections</h2>
              {selectedObjection && (
                <button
                  type="button"
                  onClick={() => setSelectedObjection(null)}
                  className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  Clear
                </button>
              )}
            </div>
            <div
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory touch-pan-x"
              role="group"
              aria-label="Select objection"
            >
              {OBJECTIONS.map((obj) => (
                <button
                  key={obj.id}
                  type="button"
                  aria-pressed={selectedObjection === obj.id}
                  onClick={() => handleObjectionClick(obj.id)}
                  className={`shrink-0 snap-start cursor-pointer rounded-full border px-3 py-2 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedObjection === obj.id
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-border bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {obj.shortLabel}
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside
          className="panel flex min-h-[320px] w-full shrink-0 flex-col overflow-hidden lg:w-[340px] xl:w-[380px] lg:min-h-0"
          aria-label="Agent logic and prompt"
        >
          <AgentPanel
            selectedStage={selectedStage}
            selectedObjection={selectedObjection}
            failureMode={failureMode}
          />
        </aside>
      </div>

      <AnalyticsBar />

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
