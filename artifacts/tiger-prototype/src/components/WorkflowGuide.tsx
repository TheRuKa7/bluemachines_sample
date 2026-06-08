interface WorkflowGuideProps {
  step: 1 | 2 | 3 | 4;
}

const STEPS = [
  { n: 1, label: "Stage" },
  { n: 2, label: "Data flow" },
  { n: 3, label: "Agent" },
  { n: 4, label: "Scenarios" },
] as const;

export function WorkflowGuide({ step }: WorkflowGuideProps) {
  const current = STEPS.find((s) => s.n === step)!;

  return (
    <nav aria-label="Review steps" className="flex items-center gap-3 text-sm">
      <ol className="flex items-center gap-1.5">
        {STEPS.map((s) => {
          const active = s.n === step;
          const done = s.n < step;
          return (
            <li key={s.n} className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums transition-colors duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {s.n}
              </span>
              {s.n < 4 && (
                <span
                  className={`hidden sm:block h-px w-4 ${done ? "bg-primary/40" : "bg-border"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <span className="hidden md:inline text-muted-foreground">
        <span className="font-medium text-foreground">{current.label}</span>
      </span>
    </nav>
  );
}
