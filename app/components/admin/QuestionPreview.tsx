import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Card } from "~/components/ui/Card";
import {
  correctAnswerFromConfig,
  CorrectAnswerSummary,
} from "~/components/questions/CorrectAnswerSummary";
import type { Question } from "~/types/game";
import type { CorrectArea, OrderItem, TextOption } from "~/types/questions";

type QuestionPreviewProps = {
  question: Question;
  onClose: () => void;
  onEdit: () => void;
};

type QuestionConfigView = {
  options?: TextOption[];
  items?: OrderItem[];
  imageUrl?: string;
  correctAnswer?: string;
  correctAnswers?: string[];
  correctArea?: CorrectArea;
  correctOrder?: string[];
};

export const QuestionPreview = ({
  question,
  onClose,
  onEdit,
}: QuestionPreviewProps) => {
  const config = question.config_json as QuestionConfigView;
  const options = config.options ?? [];
  const items = config.items ?? [];
  const correctIds = new Set(
    question.type === "multi_select"
      ? (config.correctAnswers ?? [])
      : config.correctAnswer
        ? [config.correctAnswer]
        : [],
  );
  const pinImage = question.media_url ?? config.imageUrl ?? null;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Question preview</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{question.type}</Badge>
            <span className="text-sm text-slate-500">
              {question.time_limit_seconds}s · 1 point
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit} aria-label="Edit this question">
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close question preview">
            Close
          </Button>
        </div>
      </div>

      <p className="text-lg font-semibold leading-snug text-slate-900">
        {question.question_text}
      </p>

      {question.media_url && question.type !== "pin_image" ? (
        <img
          src={question.media_url}
          alt=""
          className="max-h-64 w-full rounded-xl object-contain"
        />
      ) : null}

      {question.type === "single_choice" || question.type === "multi_select" ? (
        <ul className="space-y-2" aria-label="Answer options">
          {options.map((option) => {
            const isCorrect = correctIds.has(option.id);
            return (
              <li
                key={option.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span className="font-medium text-slate-900">
                  {option.text || option.id}
                </span>
                {isCorrect ? <Badge tone="success">Correct</Badge> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {question.type === "image_choice" ? (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label="Image options"
        >
          {options.map((option) => {
            const isCorrect = correctIds.has(option.id);
            return (
              <li
                key={option.id}
                className={`overflow-hidden rounded-lg border ${
                  isCorrect
                    ? "border-emerald-400 ring-2 ring-emerald-200"
                    : "border-slate-200"
                }`}
              >
                {option.imageUrl ? (
                  <img
                    src={option.imageUrl}
                    alt={option.text || "Option"}
                    className="h-36 w-full object-contain bg-slate-50"
                  />
                ) : (
                  <p className="p-4 text-sm text-slate-500">No image</p>
                )}
                {isCorrect ? (
                  <div className="px-3 py-2">
                    <Badge tone="success">Correct</Badge>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {question.type === "order" ? (
        <ol className="space-y-2" aria-label="Correct order">
          {(config.correctOrder ?? items.map((item) => item.id)).map((id, index) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="w-6 text-sm font-semibold text-slate-500">
                {index + 1}
              </span>
              <span className="font-medium text-slate-900">
                {items.find((item) => item.id === id)?.text ?? id}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {question.type === "pin_image" ? (
        <CorrectAnswerSummary
          type={question.type}
          correctAnswer={correctAnswerFromConfig(question.type, question.config_json)}
          imageUrl={pinImage}
        />
      ) : null}
    </Card>
  );
};
