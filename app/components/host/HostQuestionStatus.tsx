import { formatCountdown } from "~/lib/scoring-display";

type HostQuestionStatusProps = {
  remainingSeconds: number;
  isExpired: boolean;
  submitted: number;
  players: number;
};

export const HostQuestionStatus = ({
  remainingSeconds,
  isExpired,
  submitted,
  players,
}: HostQuestionStatusProps) => {
  const urgent = !isExpired && remainingSeconds <= 5;
  const pct =
    players > 0 ? Math.min(100, Math.round((submitted / players) * 100)) : 0;

  return (
    <div
      className="rounded-lg border border-festival-border bg-white px-6 py-6 text-center shadow-card"
      role="status"
      aria-live="polite"
    >
      <p
        className={`font-sans text-6xl font-bold tabular-nums sm:text-7xl ${
          isExpired || urgent ? "text-festival-danger" : "text-festival-navy"
        }`}
        aria-label={
          isExpired
            ? "Time's up"
            : `${formatCountdown(remainingSeconds)} remaining`
        }
      >
        {formatCountdown(remainingSeconds)}
      </p>
      {isExpired ? (
        <p className="mt-2 font-sans text-lg font-semibold text-festival-danger">
          Time&apos;s up
        </p>
      ) : null}
      <p className="mt-4 font-sans text-2xl font-semibold text-festival-navy">
        {submitted} / {players} answered
      </p>
      <div className="mx-auto mt-3 h-3 max-w-md overflow-hidden rounded-full bg-festival-cream-soft">
        <div
          className="h-full rounded-full bg-festival-saffron transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
