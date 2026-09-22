import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { formatPoints } from "~/lib/scoring-display";

type BetweenQuestionsProps = {
  score?: number | null;
};

export const BetweenQuestions = ({ score }: BetweenQuestionsProps) => (
  <div className="flex flex-col items-center gap-4 py-8 text-center">
    <GaneshMascot pose="thinking" size="md" />
    <h2 className="font-display text-2xl font-bold text-festival-navy">
      Next question coming up…
    </h2>
    {typeof score === "number" ? (
      <p className="font-sans text-base text-festival-muted">
        Your score so far: {formatPoints(score)} {score === 1 ? "point" : "points"}
      </p>
    ) : null}
    <p className="max-w-xs font-sans text-sm text-festival-muted">
      The host will start the next question shortly.
    </p>
  </div>
);
