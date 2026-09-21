import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { FastestAnswer } from "~/types/game";

type UseFastestAnswersArgs = {
  gameId: string | undefined;
  enabled?: boolean;
  playerId?: string;
  playerToken?: string;
  limit?: number;
};

const parseEntries = (data: unknown): FastestAnswer[] => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const entry = row as Record<string, unknown>;
    if (
      typeof entry.rank !== "number" ||
      typeof entry.display_name !== "string" ||
      typeof entry.response_time_ms !== "number"
    ) {
      return [];
    }
    return [
      {
        rank: entry.rank,
        display_name: entry.display_name,
        response_time_ms: entry.response_time_ms,
      },
    ];
  });
};

export const useFastestAnswers = ({
  gameId,
  enabled = true,
  playerId,
  playerToken,
  limit = 3,
}: UseFastestAnswersArgs) => {
  const [entries, setEntries] = useState<FastestAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: rpcError } = await supabase.rpc("get_fastest_answers", {
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

    setEntries(parseEntries(data));
    setLoading(false);
  }, [gameId, playerId, playerToken, limit]);

  useEffect(() => {
    if (!enabled || !gameId) {
      setEntries([]);
      return;
    }
    void refresh();
  }, [enabled, gameId, refresh]);

  return { entries, loading, error, refresh };
};
