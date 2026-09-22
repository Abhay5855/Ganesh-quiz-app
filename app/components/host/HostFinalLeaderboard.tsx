import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { Button } from "~/components/ui/Button";
import { formatPoints, formatResponseTime } from "~/lib/scoring-display";
import type { LeaderboardEntry } from "~/types/game";

type HostFinalLeaderboardProps = {
  entries: LeaderboardEntry[];
  onEndQuiz?: () => void;
  pending?: boolean;
};

const podiumTone: Record<number, string> = {
  1: "border-festival-gold bg-amber-50/95 shadow-[0_18px_45px_rgba(244,196,48,0.22)]",
  2: "border-slate-200 bg-slate-50",
  3: "border-orange-200 bg-orange-50/70",
};

const rankLabel: Record<number, string> = {
  1: "First place",
  2: "Second place",
  3: "Third place",
};

function PodiumPlace({
  entry,
  className = "",
}: {
  entry: LeaderboardEntry;
  className?: string;
}) {
  const isWinner = entry.rank === 1;

  return (
    <li
      className={`host-final-podium-${entry.rank} ${className} flex min-w-0 flex-col items-center rounded-xl border px-5 text-center shadow-card ${
        podiumTone[entry.rank]
      } ${isWinner ? "min-h-64 py-8 lg:mb-5" : "min-h-44 py-5"}`}
    >
      <span
        className={`inline-flex items-center justify-center font-sans font-bold tabular-nums ${
          isWinner
            ? "h-16 w-16 rounded-full border border-amber-400 bg-white text-3xl text-amber-700 shadow-sm"
            : "text-4xl leading-none text-festival-navy/70"
        }`}
        aria-label={`${rankLabel[entry.rank]}, rank ${entry.rank}`}
      >
        {entry.rank}
      </span>
      <h2
        className={`mt-4 w-full truncate font-display font-bold text-festival-navy ${
          isWinner ? "text-3xl" : "text-xl"
        }`}
      >
        {entry.display_name}
      </h2>
      <p className={`mt-2 font-sans font-bold text-festival-saffron ${isWinner ? "text-xl" : "text-base"}`}>
        {formatPoints(entry.score)} {entry.score === 1 ? "pt" : "pts"}
      </p>
      <p className="mt-1 font-sans text-sm text-festival-muted">
        {formatResponseTime(entry.total_time_ms)}
      </p>
    </li>
  );
}

export function HostFinalLeaderboard({
  entries,
  onEndQuiz,
  pending = false,
}: HostFinalLeaderboardProps) {
  const podium = entries.filter((entry) => entry.rank <= 3);
  const remaining = entries.filter((entry) => entry.rank > 3);

  return (
    <main className="host-final-screen relative mx-auto max-w-5xl overflow-hidden px-4 py-7 sm:px-6 lg:py-9">
      <div className="host-final-confetti" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      <header className="host-final-heading relative text-center">
        <p className="font-sans text-xs font-bold tracking-[0.2em] text-festival-saffron">
          QUIZ COMPLETE
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-festival-navy sm:text-5xl">
          Final Leaderboard
        </h1>
        <p className="mt-3 font-sans text-sm text-festival-muted">
          Higher score wins <span aria-hidden="true">•</span> Faster time breaks ties
        </p>
        <div className="mx-auto mt-4 h-px w-24 bg-festival-gold/70" />
      </header>

      <div className="host-final-mascot relative mx-auto mt-3 flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
        <div className="absolute inset-4 rounded-full bg-festival-gold/15 blur-xl" aria-hidden="true" />
        <GaneshMascot pose="leaderboard" size="hero" className="relative h-48 w-48 sm:h-52 sm:w-52" />
      </div>

      {entries.length === 0 ? (
        <p className="host-final-remaining mt-8 text-center font-sans text-festival-muted">
          No scores yet.
        </p>
      ) : (
        <>
          <ol className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            {podium.find((entry) => entry.rank === 1) ? (
              <PodiumPlace
                entry={podium.find((entry) => entry.rank === 1)!}
                className="lg:order-2"
              />
            ) : null}
            {podium.find((entry) => entry.rank === 2) ? (
              <PodiumPlace
                entry={podium.find((entry) => entry.rank === 2)!}
                className="lg:order-1 lg:mb-3"
              />
            ) : null}
            {podium.find((entry) => entry.rank === 3) ? (
              <PodiumPlace
                entry={podium.find((entry) => entry.rank === 3)!}
                className="lg:order-3 lg:mb-3"
              />
            ) : null}
          </ol>

          {remaining.length > 0 ? (
            <ol className="host-final-remaining mt-4 overflow-hidden rounded-lg border border-festival-border bg-white shadow-card">
              {remaining.map((entry) => (
                <li
                  key={`${entry.rank}-${entry.display_name}`}
                  className="grid min-h-20 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-festival-border px-5 last:border-b-0"
                >
                  <span className="w-6 font-sans text-lg font-bold tabular-nums text-festival-muted">
                    {entry.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-sans font-semibold text-festival-navy">
                    {entry.display_name}
                  </span>
                  <span className="shrink-0 text-right font-sans text-sm tabular-nums text-festival-muted">
                    <strong className="font-semibold text-festival-saffron">
                      {formatPoints(entry.score)} {entry.score === 1 ? "pt" : "pts"}
                    </strong>{" "}
                    <span aria-hidden="true">·</span> {formatResponseTime(entry.total_time_ms)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}

      {onEndQuiz ? (
        <div className="host-final-action mt-5 flex justify-center">
          <Button size="lg" variant="primary" disabled={pending} onClick={onEndQuiz}>
            End quiz
          </Button>
        </div>
      ) : null}
    </main>
  );
}
