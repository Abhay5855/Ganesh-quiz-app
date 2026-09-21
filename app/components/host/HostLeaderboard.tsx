import { LeaderboardTable } from "~/components/ui/LeaderboardTable";
import { Button } from "~/components/ui/Button";
import type { LeaderboardEntry } from "~/types/game";

type HostLeaderboardProps = {
  entries: LeaderboardEntry[];
  onExpand?: () => void;
  expanded?: boolean;
};

export const HostLeaderboard = ({
  entries,
  onExpand,
  expanded = false,
}: HostLeaderboardProps) => (
  <div>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="font-display text-lg font-semibold text-festival-navy">
        Leaderboard
      </h3>
      <div className="flex items-center gap-2">
        <span className="font-sans text-xs text-festival-muted">
          {expanded ? "Top 50" : "Top 10"}
        </span>
        {onExpand && !expanded ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={onExpand}
            aria-label="View more leaderboard entries"
          >
            View more
          </Button>
        ) : null}
      </div>
    </div>
    <LeaderboardTable entries={entries} />
  </div>
);
