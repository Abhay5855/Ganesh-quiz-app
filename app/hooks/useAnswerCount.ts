import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";

/** Host-only: poll answer count every ~2.5s while a question is active */
export const useAnswerCount = (
  gameId: string | undefined,
  enabled: boolean,
) => {
  const [submitted, setSubmitted] = useState(0);
  const [players, setPlayers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !gameId) return;

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const poll = async () => {
      const { data, error: rpcError } = await supabase.rpc("get_answer_count", {
        p_game_id: gameId,
      });

      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const payload = data as {
        submitted: number;
        players: number;
      };
      setSubmitted(payload.submitted);
      setPlayers(payload.players);
      setError(null);
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gameId, enabled]);

  return { submitted, players, error };
};
