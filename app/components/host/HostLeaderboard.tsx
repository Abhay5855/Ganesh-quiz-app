import { LeaderboardTable } from "~/components/ui/LeaderboardTable";
import { GaneshMascot } from "~/components/participant/GaneshMascot";
import type { LeaderboardEntry } from "~/types/game";

type HostLeaderboardProps = {
  entries: LeaderboardEntry[];
};

export const HostLeaderboard = ({
  entries,
}: HostLeaderboardProps) => (
  <div>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl font-semibold text-festival-navy">
          Final Leaderboard
        </h3>
        <p className="mt-1 font-sans text-xs text-festival-muted">
          Higher score wins • Faster time breaks ties
        </p>
      </div>
      <span className="font-sans text-xs text-festival-muted">Top 5</span>
    </div>
    <GaneshMascot pose="leaderboard" size="sm" className="mb-3" />
    <LeaderboardTable entries={entries} />
  </div>
);
