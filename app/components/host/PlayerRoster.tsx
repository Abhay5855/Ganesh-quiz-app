import type { Player } from "~/types/game";

type PlayerRosterProps = {
  players: Player[];
};

export const PlayerRoster = ({ players }: PlayerRosterProps) => (
  <div>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-lg font-semibold text-festival-navy">
        Players
      </h3>
      <span className="rounded-full bg-festival-cream-soft px-3 py-1 font-sans text-sm font-medium text-festival-navy">
        {players.length}
      </span>
    </div>
    {players.length === 0 ? (
      <p className="font-sans text-festival-muted">
        Waiting for players to join…
      </p>
    ) : (
      <ul className="max-h-[320px] space-y-1 overflow-y-auto rounded-lg border border-festival-border bg-white p-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="rounded-md px-3 py-2 font-sans text-sm font-medium text-festival-navy hover:bg-festival-cream-soft"
          >
            {player.display_name}
          </li>
        ))}
      </ul>
    )}
  </div>
);
