import { useCallback, useEffect, useState } from "react";
import {
  loadPlayerSession,
  savePlayerSession,
  clearPlayerSession,
} from "~/lib/player-session";
import type { PlayerSession } from "~/types/game";

export const usePlayer = (gameId: string | undefined) => {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadPlayerSession();
    if (stored && (!gameId || stored.game_id === gameId)) {
      setSession(stored);
    } else {
      setSession(null);
    }
    setReady(true);
  }, [gameId]);

  const persist = useCallback((next: PlayerSession) => {
    savePlayerSession(next);
    setSession(next);
  }, []);

  const clear = useCallback(() => {
    clearPlayerSession();
    setSession(null);
  }, []);

  return { session, ready, persist, clear };
};
