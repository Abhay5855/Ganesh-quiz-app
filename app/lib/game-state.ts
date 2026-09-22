import type { GamePhase } from "~/types/game";

export const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: "Lobby",
  question: "Question",
  answer_reveal: "Reveal",
  leaderboard: "Leaderboard",
  finished: "Finished",
};

/** Host-driven transitions (display helpers only — DB is source of truth) */
export const canStartQuestion = (phase: GamePhase) =>
  phase === "lobby";

export const canReveal = (phase: GamePhase) => phase === "question";

export const canShowLeaderboard = (phase: GamePhase) =>
  phase === "answer_reveal";

export const canFinish = (phase: GamePhase) =>
  phase === "leaderboard";
