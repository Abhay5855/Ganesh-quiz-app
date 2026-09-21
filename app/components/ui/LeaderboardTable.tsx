import type { LeaderboardEntry, LeaderboardMe } from "~/types/game";
import { formatPoints } from "~/lib/scoring-display";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  me?: LeaderboardMe | null;
  dark?: boolean;
};

export const LeaderboardTable = ({
  entries,
  me,
  dark = false,
}: LeaderboardTableProps) => {
  if (entries.length === 0) {
    return (
      <p
        className={`text-center ${dark ? "text-white/70" : "text-festival-muted"}`}
      >
        No scores yet.
      </p>
    );
  }

  const meOutsideTop =
    me && !entries.some((e) => e.is_me || e.rank === me.rank);

  return (
    <div className="space-y-3">
      <ol
        className={`divide-y overflow-hidden rounded-lg border ${
          dark
            ? "divide-white/10 border-white/15 bg-festival-navy"
            : "divide-festival-border border-festival-border bg-white"
        }`}
      >
        {entries.map((entry, index) => {
          const isMe = Boolean(entry.is_me);
          return (
            <li
              key={`${entry.rank}-${entry.display_name}-${index}`}
              className={`flex items-center gap-3 px-4 py-3 ${
                isMe
                  ? dark
                    ? "bg-festival-saffron/20"
                    : "bg-festival-cream-soft"
                  : ""
              }`}
            >
              <span
                className={`w-8 text-center font-sans text-lg font-bold tabular-nums ${
                  entry.rank <= 3
                    ? "text-festival-gold"
                    : dark
                      ? "text-white/60"
                      : "text-festival-muted"
                }`}
              >
                {entry.rank}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-sans font-medium ${
                  dark ? "text-white" : "text-festival-navy"
                }`}
              >
                {entry.display_name}
                {isMe ? " (you)" : ""}
              </span>
              <span
                className={`font-sans font-semibold tabular-nums ${
                  dark ? "text-festival-gold" : "text-festival-saffron"
                }`}
              >
                {formatPoints(entry.score)}
              </span>
            </li>
          );
        })}
      </ol>
      {meOutsideTop && me ? (
        <div
          className={`rounded-lg border px-4 py-3 font-sans text-sm ${
            dark
              ? "border-festival-gold/40 bg-white/5 text-white"
              : "border-festival-saffron/30 bg-festival-cream-soft text-festival-navy"
          }`}
        >
          <span className="font-semibold">Your rank: #{me.rank}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="truncate">{me.display_name}</span>
          <span className="mx-2 opacity-40">·</span>
          <span className="font-semibold text-festival-gold">
            {formatPoints(me.score)}
          </span>
        </div>
      ) : null}
    </div>
  );
};
