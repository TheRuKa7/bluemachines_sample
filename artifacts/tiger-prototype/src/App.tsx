/**
 * App.tsx — Root component and global state orchestrator.
 *
 * Owns all top-level prototype state and passes it down to child panels:
 *   - `selectedStage`     — which journey stage is being explored
 *   - `selectedObjection` — the active objection scenario (or null)
 *   - `failureMode`       — whether to simulate system degradation
 *   - `transcriptOpen`    — single-call transcript modal visibility
 *   - `compareOpen`       — side-by-side compare modal visibility
 *
 * Layout: fixed-height full-screen shell with a top header, a 3-column
 * content area (StageSelector | SystemFlowDiagram | AgentPanel), an
 * objection chip strip, and an analytics bar pinned to the bottom.
 *
 * The QueryClientProvider wraps the entire tree so any child component
 * can use React Query without its own provider setup — although this
 * prototype uses only in-memory data and makes no network requests.
 */
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StageSelector } from "@/components/StageSelector";
import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";
import { AgentPanel } from "@/components/AgentPanel";
import { AnalyticsBar } from "@/components/AnalyticsBar";
import { CallTranscriptModal } from "@/components/CallTranscriptModal";
import { CompareTranscriptModal } from "@/components/CompareTranscriptModal";
import { OBJECTIONS, STAGES, type StageId } from "@/data/model";

/** Singleton React Query client — no actual queries are issued in this prototype. */
const queryClient = new QueryClient();

/** Core prototype UI. Separated from App so QueryClientProvider wraps the component. */
function Prototype() {
  const [selectedStage, setSelectedStage] = useState<StageId>("APPROVED");
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [failureMode, setFailureMode] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  /**
   * Toggle objection selection: clicking the same chip twice clears the selection.
   * Only one objection can be active at a time.
   */
  const handleObjectionClick = (id: string) => {
    setSelectedObjection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden select-none">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      {/* Branding left, action buttons (Transcript / Compare / Failure Mode) right */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card/60 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-[11px] font-black">TC</span>
            </div>
            <div>
              <p className="text-[12px] font-bold text-foreground leading-none">Tiger Credit Card</p>
              <p className="text-[9px] text-muted-foreground leading-none mt-0.5">AI Voice Agent · Onboarding System Design</p>
            </div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-[10px] text-muted-foreground">
            <span className="text-foreground font-medium">Blue Machines</span> · Enterprise Deployment Prototype
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live stage indicator — mirrors the left panel selection */}
          <div className="text-[10px] text-muted-foreground">
            Stage: <span className="text-foreground font-semibold">{selectedStage.replace(/_/g, " ")}</span>
          </div>

          {/* Opens the single-call transcript modal for the current stage/objection/failure combination */}
          <button
            onClick={() => setTranscriptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
              <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="3" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1"/>
              <line x1="3" y1="6.5" x2="9" y2="6.5" stroke="currentColor" strokeWidth="1"/>
              <line x1="3" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth="1"/>
            </svg>
            Call Transcript
          </button>

          {/* Opens Compare Mode — side-by-side transcript view for any two stage configurations */}
          <button
            onClick={() => setCompareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border bg-card border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:border-indigo-400/50 hover:bg-indigo-500/10"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
              <rect x="1" y="1" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
              <rect x="7" y="1" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.1"/>
            </svg>
            Compare
          </button>

          {/* Failure Mode toggle: when active, the flow diagram dims affected nodes,
              eval metrics degrade by a preset factor, and the transcript switches to
              the failure-mode conversation script for the current stage. */}
          <button
            onClick={() => setFailureMode((v) => !v)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all border
              ${failureMode
                ? "bg-red-950/60 border-red-800/60 text-red-400"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all ${failureMode ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`}
            />
            {failureMode ? "Failure Mode ON" : "Failure Mode"}
          </button>
        </div>
      </header>

      {/* ── Main 3-panel layout ─────────────────────────────────────────── */}
      {/* Each panel has a fixed width (left/right) or grows to fill (centre). */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Stage Selector — vertical journey timeline */}
        <aside className="w-[210px] flex-shrink-0 border-r border-border bg-card/30 px-3 py-3 overflow-hidden flex flex-col">
          <StageSelector selectedStage={selectedStage} onSelectStage={setSelectedStage} />
        </aside>

        {/* Centre: System Interaction Flow — SVG diagram of active nodes + arrows */}
        <main className="flex-1 min-w-0 border-r border-border bg-background p-4 flex flex-col overflow-hidden">
          <SystemFlowDiagram selectedStage={selectedStage} failureMode={failureMode} />
        </main>

        {/* Right: Agent Panel — tabbed view of agent logic, data fields, and guardrails */}
        <aside className="w-[320px] flex-shrink-0 bg-card/20 overflow-hidden flex flex-col">
          <AgentPanel
            selectedStage={selectedStage}
            selectedObjection={selectedObjection}
            failureMode={failureMode}
          />
        </aside>
      </div>

      {/* ── Objection chip strip ────────────────────────────────────────── */}
      {/* Selecting a chip injects that objection's transcript turns into the
          call transcript, and shows the objection's data dependencies in the
          Data Available tab of AgentPanel. Only one objection at a time. */}
      <div className="flex-shrink-0 border-t border-border bg-card/40 px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold flex-shrink-0 mr-1">Objections</span>
          {OBJECTIONS.map((obj) => (
            <button
              key={obj.id}
              onClick={() => handleObjectionClick(obj.id)}
              className={`
                flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-medium transition-all border whitespace-nowrap
                ${selectedObjection === obj.id
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }
              `}
            >
              {obj.shortLabel}
            </button>
          ))}
          {/* Clear button only renders when an objection is active */}
          {selectedObjection && (
            <button
              onClick={() => setSelectedObjection(null)}
              className="flex-shrink-0 text-[9px] text-muted-foreground hover:text-foreground ml-1 px-2 py-1 rounded border border-dashed border-border"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Analytics bar ───────────────────────────────────────────────── */}
      {/* Six KPI tiles pinned to the bottom; values degrade when failureMode=true. */}
      <AnalyticsBar selectedStage={selectedStage} failureMode={failureMode} />

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {/* Both modals are always mounted but return null when closed, avoiding
          remount flicker when they are opened repeatedly. */}
      <CallTranscriptModal
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        selectedStage={selectedStage}
        selectedObjection={selectedObjection}
        failureMode={failureMode}
      />
      <CompareTranscriptModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        initialStageLeft={selectedStage}
        initialStageRight={
          /* Default right column to the next stage in the journey after the currently selected one */
          STAGES.find((s) => s.id !== selectedStage)?.id ?? "EKYC_PENDING"
        }
      />
    </div>
  );
}

/** Wraps Prototype in the React Query context required by the component tree. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Prototype />
    </QueryClientProvider>
  );
}
