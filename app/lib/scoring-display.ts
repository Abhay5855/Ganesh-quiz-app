/** UI helpers only — never authoritative for awarded points */

export const formatPoints = (points: number) =>
  new Intl.NumberFormat("en-IN").format(points);

export const formatResponseTime = (ms: number | null | undefined) => {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "—";
  }

  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
};

export const formatCountdown = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const resultLabel = (isCorrect: boolean) =>
  isCorrect ? "Correct!" : "Not quite!";
