import { Medal } from "lucide-react";
import type { LeaderboardEntry, LeaderboardMe } from "~/types/game";
import { formatPoints, formatResponseTime } from "~/lib/scoring-display";

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
  const getTopRankClass = (rank: number) => {
    if (rank === 1) return "border-amber-300 bg-amber-50 text-amber-600";
    if (rank === 2) return "border-slate-300 bg-slate-50 text-slate-500";
    if (rank === 3) return "border-orange-300 bg-orange-50 text-orange-600";
    return "";
  };
  const getTopRowClass = (rank: number) => {
    if (rank === 1) {
      return dark ? "bg-amber-300/10" : "bg-amber-50/70";
    }
    if (rank === 2) {
      return dark ? "bg-slate-200/10" : "bg-slate-50";
    }
    if (rank === 3) {
      return dark ? "bg-orange-300/10" : "bg-orange-50/70";
    }
    return "";
  };

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
          const isTopThree = entry.rank <= 3;
          return (
            <li
              key={`${entry.rank}-${entry.display_name}-${index}`}
              className={`flex items-center gap-4 px-5 py-4 ${
                isMe
                  ? dark
                    ? "bg-festival-saffron/20"
                    : "bg-festival-cream-soft"
                  : getTopRowClass(entry.rank)
              }`}
            >
              <span
                className={`flex h-10 w-14 shrink-0 items-center justify-center gap-1 rounded-full border font-sans text-base font-bold tabular-nums ${
                  isTopThree
                    ? getTopRankClass(entry.rank)
                    : dark
                      ? "border-white/10 text-white/60"
                      : "border-festival-border text-festival-muted"
                }`}
              >
                {isTopThree ? (
                  <>
                    <Medal aria-hidden className="h-5 w-5" />
                    {entry.rank}
                  </>
                ) : (
                  entry.rank
                )}
                <span className="sr-only">Rank {entry.rank}</span>
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-sans font-medium ${
                  dark ? "text-white" : "text-festival-navy"
                }`}
              >
                {entry.display_name}
                {isMe ? " (you)" : ""}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 font-sans tabular-nums">
                <span
                  className={`font-semibold ${
                    dark ? "text-festival-gold" : "text-festival-saffron"
                  }`}
                >
                  {formatPoints(entry.score)} {entry.score === 1 ? "pt" : "pts"}
                </span>
                <span
                  className={`text-xs font-medium ${
                    dark ? "text-white/65" : "text-festival-muted"
                  }`}
                >
                  Time {formatResponseTime(entry.total_time_ms)}
                </span>
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
            {formatPoints(me.score)} {me.score === 1 ? "pt" : "pts"}
            <span className="ml-2 font-normal opacity-75">
              • {formatResponseTime(me.total_time_ms)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
};
