import { formatCountdown } from "~/lib/scoring-display";

type TimerBarProps = {
  remainingSeconds: number;
  durationSeconds: number;
  questionNumber?: number;
  questionCount?: number;
  isExpired?: boolean;
  points?: number;
};

export const TimerBar = ({
  remainingSeconds,
  durationSeconds,
  questionNumber,
  questionCount,
  isExpired,
  points,
}: TimerBarProps) => {
  const pct =
    durationSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / durationSeconds) * 100))
      : 0;
  const urgent = !isExpired && remainingSeconds <= 5;
  const progressLabel =
    questionNumber && questionCount
      ? `Question ${questionNumber} of ${questionCount}`
      : "Question";
  const clock = formatCountdown(remainingSeconds);

  return (
    <div
      className="pb-2"
      role="timer"
      aria-live="polite"
      aria-label={
        isExpired ? "Time's up" : `${clock} remaining. ${progressLabel}`
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-sans text-sm font-semibold text-festival-muted">
            {progressLabel}
          </p>
          {typeof points === "number" ? (
            <p className="font-sans text-xs text-festival-muted">
              {points} {points === 1 ? "point" : "points"}
            </p>
          ) : null}
        </div>
        <p
          className={`font-sans text-3xl font-bold tabular-nums ${
            isExpired || urgent ? "text-festival-danger" : "text-festival-navy"
          }`}
        >
          {clock}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-festival-cream-soft">
        <div
          className={`h-full rounded-full motion-reduce:transition-none ${
            isExpired || urgent ? "bg-festival-danger" : "bg-festival-saffron"
          } transition-[width] duration-100`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isExpired ? (
        <p className="mt-2 text-center font-sans text-sm font-semibold text-festival-danger">
          Time&apos;s up
        </p>
      ) : null}
    </div>
  );
};
