/** UI helpers only — never authoritative for awarded points */

export const formatPoints = (points: number) =>
  new Intl.NumberFormat("en-IN").format(points);

export const formatResponseTime = (ms: number) => {
  const seconds = Math.max(0, ms) / 1000;
  return `${seconds.toFixed(2)}s`;
};

export const formatCountdown = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const resultLabel = (isCorrect: boolean) =>
  isCorrect ? "Correct!" : "Not quite!";

