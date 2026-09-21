import type {
  CorrectArea,
  OrderItem,
  QuestionConfig,
  QuestionType,
  TextOption,
} from "~/types/questions";
import { PinImage } from "./PinImage";

type CorrectAnswerSummaryProps = {
  type: QuestionType;
  correctAnswer: Record<string, unknown>;
  options?: TextOption[];
  items?: OrderItem[];
  imageUrl?: string | null;
  playerPin?: { x: number; y: number } | null;
};

export const correctAnswerFromConfig = (
  type: QuestionType,
  config: QuestionConfig,
): Record<string, unknown> => {
  const cfg = config as Record<string, unknown>;
  switch (type) {
    case "single_choice":
    case "image_choice":
      return { correctAnswer: cfg.correctAnswer };
    case "multi_select":
      return { correctAnswers: cfg.correctAnswers };
    case "pin_image":
      return { correctArea: cfg.correctArea };
    case "order":
      return { correctOrder: cfg.correctOrder };
    default:
      return {};
  }
};

const optionLabel = (options: TextOption[] | undefined, id: string) =>
  options?.find((option) => option.id === id)?.text ?? id;

export const CorrectAnswerSummary = ({
  type,
  correctAnswer,
  options,
  items,
  imageUrl,
  playerPin,
}: CorrectAnswerSummaryProps) => {
  const area = correctAnswer.correctArea as CorrectArea | undefined;
  const correctIds = Array.isArray(correctAnswer.correctAnswers)
    ? (correctAnswer.correctAnswers as string[])
    : [];
  const orderIds = Array.isArray(correctAnswer.correctOrder)
    ? (correctAnswer.correctOrder as string[])
    : [];
  const singleId =
    typeof correctAnswer.correctAnswer === "string"
      ? correctAnswer.correctAnswer
      : null;
  const singleImage = options?.find((option) => option.id === singleId)?.imageUrl;

  return (
    <section
      className="rounded-lg border border-festival-border bg-festival-cream-soft px-4 py-4"
      aria-label="Correct answer"
    >
      <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-festival-muted">
        Correct answer
      </h3>

      {type === "single_choice" && singleId ? (
        <p className="mt-2 font-sans text-lg font-semibold text-festival-navy">
          {optionLabel(options, singleId)}
        </p>
      ) : null}

      {type === "image_choice" && singleId ? (
        <div className="mt-3">
          {singleImage ? (
            <img
              src={singleImage}
              alt={optionLabel(options, singleId)}
              className="max-h-40 rounded-lg object-contain"
            />
          ) : (
            <p className="font-sans text-lg font-semibold text-festival-navy">
              {optionLabel(options, singleId)}
            </p>
          )}
        </div>
      ) : null}

      {type === "multi_select" ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-base font-medium text-festival-navy">
          {correctIds.map((id) => (
            <li key={id}>{optionLabel(options, id)}</li>
          ))}
        </ul>
      ) : null}

      {type === "order" ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 font-sans text-base font-medium text-festival-navy">
          {orderIds.map((id) => (
            <li key={id}>
              {items?.find((item) => item.id === id)?.text ?? id}
            </li>
          ))}
        </ol>
      ) : null}

      {type === "pin_image" && imageUrl && area ? (
        <div className="mt-3">
          <PinImage
            imageUrl={imageUrl}
            selected={null}
            onPin={() => undefined}
            interactive={false}
            hotspot={area}
            playerPin={playerPin ?? null}
          />
        </div>
      ) : null}

      {type === "pin_image" && !imageUrl ? (
        <p className="mt-2 font-sans text-sm text-festival-muted">
          Pin inside the marked region.
        </p>
      ) : null}
    </section>
  );
};
