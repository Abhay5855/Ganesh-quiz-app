import { useMemo, useState } from "react";
import type { Player } from "~/types/game";

type PlayerRosterProps = {
  players: Player[];
  compact?: boolean;
};

export const PlayerRoster = ({ players, compact = false }: PlayerRosterProps) => {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filteredPlayers = useMemo(
    () => players.filter((player) => player.display_name.toLocaleLowerCase().includes(query)),
    [players, query],
  );
  const showRoster = !compact || expanded;

  return (
    <section aria-label="Players" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-festival-navy">Players</h2>
        <span className="font-sans text-sm font-semibold tabular-nums text-festival-navy">
          {players.length} {compact ? "connected" : "joined"}
        </span>
      </div>
      {compact ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 rounded-md font-sans text-sm font-medium text-festival-navy underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-festival-navy"
        >
          {expanded ? "Hide players" : "View players"}
        </button>
      ) : null}
      {showRoster ? (
        <div className="mt-3">
          <label htmlFor="host-player-search" className="sr-only">Search players</label>
          <input
            id="host-player-search"
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-festival-border bg-white px-3 py-2 font-sans text-sm text-festival-navy placeholder:text-festival-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-festival-navy"
          />
          <div
            tabIndex={0}
            role="region"
            aria-label="Player roster"
            className="mt-3 max-h-[300px] overflow-y-auto rounded-md border border-festival-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-festival-navy"
          >
            {filteredPlayers.length === 0 ? (
              <p className="px-3 py-3 font-sans text-sm text-festival-muted">
                {players.length === 0 && !query ? "Waiting for players to join…" : "No players found"}
              </p>
            ) : (
              <ul className="divide-y divide-festival-border">
                {filteredPlayers.map((player) => (
                  <li key={player.id} className="min-h-10 px-3 py-2 font-sans text-sm font-medium text-festival-navy">
                    {player.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
