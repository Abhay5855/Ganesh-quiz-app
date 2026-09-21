import { formatResponseTime } from "~/lib/scoring-display";
import type { FastestAnswer } from "~/types/game";

type FastestFingersProps = {
  entries: FastestAnswer[];
  prominent?: boolean;
};

export const FastestFingers = ({
  entries,
  prominent = false,
}: FastestFingersProps) => (
  <section
    className={`rounded-lg border px-4 py-4 ${
      prominent
        ? "border-festival-gold/50 bg-festival-cream-soft"
        : "border-festival-border bg-white"
    }`}
    aria-label="Fastest Fingers"
  >
    <h3
      className={`font-sans font-bold uppercase tracking-wide text-festival-maroon ${
        prominent ? "text-center text-xl sm:text-2xl" : "text-sm"
      }`}
    >
      Fastest Fingers
    </h3>
    {entries.length === 0 ? (
      <p className="mt-3 text-center font-sans text-festival-muted">
        No correct answers this round.
      </p>
    ) : (
      <ol className={`mt-3 space-y-2 ${prominent ? "space-y-3" : ""}`}>
        {entries.map((entry) => (
          <li
            key={`${entry.rank}-${entry.display_name}`}
            className="flex items-baseline justify-between gap-4"
          >
            <span
              className={`truncate font-sans font-semibold text-festival-navy ${
                prominent ? "text-xl sm:text-2xl" : "text-base"
              }`}
            >
              {entry.rank}. {entry.display_name}
            </span>
            <span
              className={`font-sans tabular-nums text-festival-muted ${
                prominent ? "text-lg sm:text-xl" : "text-sm"
              }`}
            >
              {formatResponseTime(entry.response_time_ms)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </section>
);
