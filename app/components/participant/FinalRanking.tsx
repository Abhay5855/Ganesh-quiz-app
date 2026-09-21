import { GaneshMascot } from "~/components/participant/GaneshMascot";
import { FestivalConfetti } from "~/components/participant/FestivalConfetti";
import { formatPoints } from "~/lib/scoring-display";
import type { LeaderboardMe } from "~/types/game";

type FinalRankingProps = {
  me?: LeaderboardMe | null;
  questionCount?: number;
};

export const FinalRanking = ({ me, questionCount }: FinalRankingProps) => (
  <div className="relative flex flex-col gap-5 overflow-hidden text-center">
    <FestivalConfetti active />
    <GaneshMascot pose="firstPlace" size="lg" className="mb-3" />
    <h2 className="font-display text-3xl font-bold text-festival-navy">
      Quiz complete
    </h2>
    {me ? (
      <p className="font-sans text-lg text-festival-muted">
        You finished #{me.rank} with {formatPoints(me.score)} points
        {questionCount ? ` · ${questionCount} questions` : ""}
      </p>
    ) : (
      <p className="font-sans text-festival-muted">
        Thanks for playing! Check the host screen for final standings.
      </p>
    )}
  </div>
);
