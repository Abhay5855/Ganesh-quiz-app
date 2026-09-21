import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { LeaderboardEntry, LeaderboardMe } from "~/types/game";

type UseLeaderboardArgs = {
  gameId: string | undefined;
  enabled?: boolean;
  playerId?: string;
  playerToken?: string;
  limit?: number;
};

export const useLeaderboard = ({
  gameId,
  enabled = true,
  playerId,
  playerToken,
  limit = 10,
}: UseLeaderboardArgs) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("get_leaderboard", {
      p_game_id: gameId,
      p_player_id: playerId ?? null,
      p_player_token: playerToken ?? null,
      p_limit: limit,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const payload = data as {
      entries?: LeaderboardEntry[];
      me?: LeaderboardMe | null;
    } | null;
    setEntries(payload?.entries ?? []);
    setMe(payload?.me ?? null);
    setLoading(false);
  }, [gameId, playerId, playerToken, limit]);

  useEffect(() => {
    if (!enabled || !gameId) return;
    void refresh();
  }, [enabled, gameId, refresh]);

  return { entries, me, loading, error, refresh };
};
