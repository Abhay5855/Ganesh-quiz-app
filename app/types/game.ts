export const GAME_PHASES = [
  "lobby",
  "question",
  "answer_reveal",
  "leaderboard",
  "finished",
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

export type GameStatus = "active" | "finished";

export type QuizStatus = "draft" | "published" | "archived";

export type Game = {
  id: string;
  quiz_id: string;
  game_code: string;
  status: GameStatus;
  current_question_id: string | null;
  phase: GamePhase;
  question_started_at: string | null;
  created_at: string;
  finished_at: string | null;
  host_user_id: string | null;
};

export type Player = {
  id: string;
  game_id: string;
  display_name: string;
  score: number;
  joined_at: string;
};

export type Quiz = {
  id: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  created_at: string;
};

export type Question = {
  id: string;
  quiz_id: string;
  type: import("./questions").QuestionType;
  question_text: string;
  media_url: string | null;
  config_json: import("./questions").QuestionConfig;
  time_limit_seconds: number;
  points: number;
  position: number;
  created_at: string;
  updated_at: string;
};

export type LeaderboardEntry = {
  rank: number;
  display_name: string;
  score: number;
  total_time_ms: number;
  is_me?: boolean;
};

export type FastestAnswer = {
  rank: number;
  display_name: string;
  response_time_ms: number;
};

export type LeaderboardMe = {
  rank: number;
  display_name: string;
  score: number;
  total_time_ms: number;
};

export type PlayerSession = {
  player_id: string;
  player_token: string;
  game_id: string;
};

/** `get_player_state` RPC — score is null during lobby/question. */
export type PlayerState = {
  player_id: string;
  game_id: string;
  display_name: string;
  score: number | null;
  phase: GamePhase;
  status: GameStatus;
  current_question_id: string | null;
  question_started_at: string | null;
  answered_question_ids: string[];
};
