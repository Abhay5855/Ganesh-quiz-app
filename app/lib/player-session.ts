import type { PlayerSession } from "~/types/game";

const KEY = "ganesh-quiz-player";

export const savePlayerSession = (session: PlayerSession) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(session));
};

export const loadPlayerSession = (): PlayerSession | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlayerSession;
    if (!parsed.player_id || !parsed.game_id || !parsed.player_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearPlayerSession = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
};
