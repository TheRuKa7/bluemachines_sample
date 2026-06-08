import { useState } from "react";
import { Star } from "lucide-react";

interface CallRatingPanelProps {
  onSubmit: (stars: number, comment: string) => void;
  disabled?: boolean;
}

export function CallRatingPanel({ onSubmit, disabled }: CallRatingPanelProps) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const display = hover || stars;

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Rate your call with Aria</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your feedback updates CSAT and the live eval metrics below.
        </p>
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => setStars(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer rounded p-1 transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={stars === n}
          >
            <Star
              className={`h-8 w-8 ${n <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
              aria-hidden
            />
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-sm font-medium text-foreground">{stars}/5</span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={disabled}
        placeholder="Optional: what went well or what to improve"
        rows={2}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <button
        type="button"
        disabled={disabled || stars < 1}
        onClick={() => onSubmit(stars, comment.trim())}
        className="w-full cursor-pointer rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit feedback
      </button>
    </div>
  );
}
