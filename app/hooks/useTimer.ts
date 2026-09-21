import { useEffect, useState } from "react";

/**
 * Client countdown derived from authoritative question_started_at.
 * remaining = duration - (Date.now() - startedAt)
 * Recomputes immediately on tab visibility resume.
 */
export const useTimer = (
  startedAt: string | null | undefined,
  durationSeconds: number | null | undefined,
) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!startedAt || !durationSeconds) {
      setRemainingMs(0);
      return;
    }

    const compute = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      return Math.max(0, durationSeconds * 1000 - elapsed);
    };

    setRemainingMs(compute());

    const id = window.setInterval(() => {
      setRemainingMs(compute());
    }, 100);

    const handleResume = () => {
      setRemainingMs(compute());
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
    };
  }, [startedAt, durationSeconds]);

  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    isExpired: remainingMs <= 0 && Boolean(startedAt && durationSeconds),
  };
};
