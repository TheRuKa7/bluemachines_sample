/**
 * Guided review flow aligned to Blue Machines assignment:
 * 1 Journey stage → 2 System data flow → 3 Agent logic & data → 4 Objections / failure / transcript
 */

interface WorkflowGuideProps {
  step: 1 | 2 | 3 | 4;
}

const STEPS = [
  { n: 1, label: "Journey stage", hint: "Where is the customer in onboarding?" },
  { n: 2, label: "Data flow", hint: "What systems READ / WRITE / NOTIFY?" },
  { n: 3, label: "Agent design", hint: "Logic, fields, prompt, guardrails" },
  { n: 4, label: "Scenarios", hint: "Objections, failure mode, call flow" },
] as const;

export function WorkflowGuide({ step }: WorkflowGuideProps) {
  return (
    <nav aria-label="Review workflow" className="flex-shrink-0 border-b border-border/80 bg-muted/20 px-4 py-2.5">
      <ol className="flex flex-wrap items-center gap-2 sm:gap-4">
        {STEPS.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          return (
            <li key={s.n} className="flex items-center gap-2 min-w-0">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {s.n}
              </span>
              <div className="min-w-0 hidden sm:block">
                <p className={`text-xs font-semibold leading-tight ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                {active && (
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">{s.hint}</p>
                )}
              </div>
              {s.n < 4 && (
                <span className="hidden md:inline text-muted-foreground/40 mx-1" aria-hidden>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
