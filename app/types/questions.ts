export const QUESTION_TYPES = [
  "single_choice",
  "multi_select",
  "image_choice",
  "pin_image",
  "order",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export type TextOption = {
  id: string;
  text?: string;
  imageUrl?: string;
};

export type OrderItem = {
  id: string;
  text: string;
};

export type CorrectArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SingleChoiceConfig = {
  options: TextOption[];
  correctAnswer: string;
};

export type MultiSelectConfig = {
  options: TextOption[];
  correctAnswers: string[];
};

export type ImageChoiceConfig = {
  options: TextOption[];
  correctAnswer: string;
};

export type PinImageConfig = {
  imageUrl?: string;
  correctArea: CorrectArea;
};

export type OrderConfig = {
  items: OrderItem[];
  correctOrder: string[];
};

export type QuestionConfig =
  | SingleChoiceConfig
  | MultiSelectConfig
  | ImageChoiceConfig
  | PinImageConfig
  | OrderConfig
  | Record<string, unknown>;

/** Participant submit payloads — never include scoring fields */
export type AnswerPayload =
  | { optionId: string }
  | { optionIds: string[] }
  | { x: number; y: number }
  | { order: string[] };

export type ActiveQuestion = {
  id: string;
  type: QuestionType;
  question_text: string;
  media_url: string | null;
  time_limit_seconds: number;
  points: number;
  question_started_at: string | null;
  question_number?: number;
  question_count?: number;
  already_answered: boolean;
  options: TextOption[];
  items: OrderItem[];
  image_url: string | null;
};

export type QuestionReveal = {
  question_id: string;
  type: QuestionType;
  question_text?: string;
  media_url?: string | null;
  options?: TextOption[];
  items?: OrderItem[];
  image_url?: string | null;
  correct_answer: Record<string, unknown>;
  player_result: {
    answer_json: AnswerPayload;
    is_correct: boolean;
    points_awarded: number;
    response_time_ms: number;
  } | null;
};
