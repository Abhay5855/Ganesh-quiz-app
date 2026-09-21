import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "~/lib/supabase.client";
import type { Game } from "~/types/game";

export type ConnectionState = "connected" | "reconnecting" | "idle";

const RETRY_DELAYS_MS = [1000, 2000, 5000, 8000] as const;

/**
 * Single Realtime subscription on `games` for one game id.
 * Cleans up on unmount; guards against Strict Mode double-subscribe.
 * Distinguishes intentional cleanup from unexpected disconnect.
 */
export const useGameSession = (gameId: string | undefined) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const subscribedRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getSupabaseBrowserClient>["channel"]
  > | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current != null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    const supabase = getSupabaseBrowserClient();
    const { data, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setGame(data);
    setLoading(false);
    setError(null);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;
    intentionalCloseRef.current = false;
    const supabase = getSupabaseBrowserClient();

    const scheduleRetry = () => {
      if (cancelled || intentionalCloseRef.current) return;
      clearRetryTimer();
      const attempt = retryAttemptRef.current;
      const delay =
        RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 8000;
      retryAttemptRef.current = attempt + 1;
      retryTimerRef.current = window.setTimeout(() => {
        if (cancelled || intentionalCloseRef.current) return;
        void fetchGame();
        // Re-subscribe by tearing down and recreating channel
        if (channelRef.current) {
          void supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          subscribedRef.current = false;
        }
        attachChannel();
      }, delay);
    };

    const attachChannel = () => {
      if (cancelled || intentionalCloseRef.current) return;
      if (subscribedRef.current) return;
      subscribedRef.current = true;

      const channel = supabase
        .channel(`game-${gameId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "games",
            filter: `id=eq.${gameId}`,
          },
          (payload: { new: Game }) => {
            if (cancelled) return;
            setGame(payload.new);
          },
        )
        .subscribe((status: string) => {
          if (cancelled || intentionalCloseRef.current) return;

          if (status === "SUBSCRIBED") {
            retryAttemptRef.current = 0;
            clearRetryTimer();
            setConnectionState("connected");
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            if (intentionalCloseRef.current) return;
            setConnectionState("reconnecting");
            scheduleRetry();
          }
        });

      channelRef.current = channel;
    };

    void fetchGame();
    attachChannel();

    return () => {
      cancelled = true;
      intentionalCloseRef.current = true;
      clearRetryTimer();
      subscribedRef.current = false;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setConnectionState("idle");
    };
  }, [gameId, fetchGame, clearRetryTimer]);

  return {
    game,
    loading,
    error,
    refresh: fetchGame,
    connectionState,
  };
};
