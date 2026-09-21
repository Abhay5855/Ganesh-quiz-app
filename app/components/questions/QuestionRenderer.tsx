import { useEffect, useState } from "react";
import type { ActiveQuestion, AnswerPayload, OrderItem } from "~/types/questions";
import { Button } from "~/components/ui/Button";
import { SingleChoice } from "./SingleChoice";
import { MultiSelect } from "./MultiSelect";
import { ImageChoice } from "./ImageChoice";
import { PinImage } from "./PinImage";
import { Order } from "./Order";

type QuestionRendererProps = {
  question: ActiveQuestion;
  disabled?: boolean;
  onSubmit: (payload: AnswerPayload) => void;
  submitting?: boolean;
};

const submitLabel = (
  type: ActiveQuestion["type"],
  submitting: boolean | undefined,
) => {
  if (submitting) {
    if (type === "order") return "Submitting order…";
    if (type === "multi_select") return "Submitting…";
    return "Locking answer…";
  }
  if (type === "order") return "Submit order";
  if (type === "multi_select") return "Submit answer";
  return "Lock answer";
};

export const QuestionRenderer = ({
  question,
  disabled,
  onSubmit,
  submitting,
}: QuestionRendererProps) => {
  const [singleId, setSingleId] = useState<string | null>(null);
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(question.items ?? []);

  useEffect(() => {
    setSingleId(null);
    setMultiIds([]);
    setPin(null);
    setOrderItems(question.items ?? []);
  }, [question.id, question.items]);

  const handleSubmit = () => {
    let payload: AnswerPayload | null = null;
    switch (question.type) {
      case "single_choice":
      case "image_choice":
        if (!singleId) return;
        payload = { optionId: singleId };
        break;
      case "multi_select":
        if (multiIds.length === 0) return;
        payload = { optionIds: multiIds };
        break;
      case "pin_image":
        if (!pin) return;
        payload = pin;
        break;
      case "order":
        payload = { order: orderItems.map((i) => i.id) };
        break;
      default:
        return;
    }
    onSubmit(payload);
  };

  const canSubmit = (() => {
    switch (question.type) {
      case "single_choice":
      case "image_choice":
        return Boolean(singleId);
      case "multi_select":
        return multiIds.length > 0;
      case "pin_image":
        return Boolean(pin);
      case "order":
        return orderItems.length > 0;
      default:
        return false;
    }
  })();

  const imageUrl = question.image_url ?? question.media_url;
  const showMedia =
    Boolean(question.media_url) && question.type !== "pin_image";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-bold leading-snug text-festival-navy sm:text-2xl">
        {question.question_text}
      </h2>

      {showMedia ? (
        <div className="flex aspect-[16/10] max-h-[240px] w-full items-center justify-center overflow-hidden rounded-lg bg-festival-cream-soft">
          <img
            src={question.media_url ?? undefined}
            alt=""
            loading="lazy"
            className="max-h-[240px] w-full object-contain"
          />
        </div>
      ) : null}

      {question.type === "single_choice" ? (
        <SingleChoice
          options={question.options}
          selectedId={singleId}
          disabled={disabled || submitting}
          onSelect={setSingleId}
        />
      ) : null}

      {question.type === "multi_select" ? (
        <MultiSelect
          options={question.options}
          selectedIds={multiIds}
          disabled={disabled || submitting}
          onToggle={(id) =>
            setMultiIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
            )
          }
        />
      ) : null}

      {question.type === "image_choice" ? (
        <ImageChoice
          options={question.options}
          selectedId={singleId}
          disabled={disabled || submitting}
          onSelect={setSingleId}
        />
      ) : null}

      {question.type === "pin_image" && imageUrl ? (
        <PinImage
          imageUrl={imageUrl}
          selected={pin}
          disabled={disabled || submitting}
          onPin={setPin}
        />
      ) : null}

      {question.type === "order" ? (
        <Order
          items={orderItems}
          disabled={disabled || submitting}
          onChange={setOrderItems}
        />
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 bg-white/95 pb-1 pt-2 backdrop-blur-sm safe-pad-bottom">
        <Button
          size="lg"
          className="w-full min-h-14"
          disabled={disabled || !canSubmit || submitting}
          onClick={handleSubmit}
          aria-label={submitLabel(question.type, submitting)}
        >
          {submitLabel(question.type, submitting)}
        </Button>
      </div>
    </div>
  );
};
