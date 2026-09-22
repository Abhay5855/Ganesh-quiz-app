import {
  formatPoints,
  formatResponseTime,
  resultLabel,
} from "~/lib/scoring-display";
import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { FestivalConfetti } from "~/components/participant/FestivalConfetti";

type ResultBannerProps = {
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs?: number;
  isFinalQuestion?: boolean;
};

export const ResultBanner = ({
  isCorrect,
  pointsAwarded,
  responseTimeMs,
  isFinalQuestion = false,
}: ResultBannerProps) => (
  <div
    className={`relative overflow-hidden rounded-lg border px-4 py-5 text-center ${
      isCorrect
        ? "border-festival-success/30 bg-festival-success/10"
        : "border-festival-maroon/20 bg-festival-cream-soft"
    }`}
    role="status"
    aria-live="polite"
  >
    <FestivalConfetti active={isCorrect} />
    <GaneshMascot
      pose={isCorrect ? "happy" : "surprised"}
      size="md"
      className="mb-3"
    />
    <p
      className={`font-display text-2xl font-bold ${
        isCorrect ? "text-festival-success" : "text-festival-maroon"
      }`}
    >
      {resultLabel(isCorrect)}
    </p>
    <p className="mt-1 font-sans text-base font-medium text-festival-navy">
      {isCorrect ? `+${formatPoints(pointsAwarded)} point` : "0 points"}
    </p>
    {typeof responseTimeMs === "number" ? (
      <p className="mt-1 font-sans text-sm text-festival-muted">
        Response time {formatResponseTime(responseTimeMs)}
      </p>
    ) : null}
    <p className="mt-3 font-sans text-sm text-festival-muted">
      {isFinalQuestion ? "Final leaderboard coming up…" : "Next question coming up…"}
    </p>
  </div>
);
