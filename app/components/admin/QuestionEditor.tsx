import { useState, type FormEvent } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ImageUploadField } from "./ImageUploadField";
import { OptionListEditor } from "./OptionListEditor";
import { AreaRegionEditor } from "./AreaRegionEditor";
import { QUESTION_TYPES, type QuestionConfig, type QuestionType, type TextOption, type OrderItem, type CorrectArea } from "~/types/questions";

type QuestionEditorProps = {
  initial?: {
    type: QuestionType;
    question_text: string;
    media_url: string | null;
    config_json: QuestionConfig;
    time_limit_seconds: number;
    points: number;
  };
  onSubmit: (values: {
    type: QuestionType;
    question_text: string;
    media_url: string | null;
    config_json: QuestionConfig;
    time_limit_seconds: number;
    points: number;
  }) => Promise<void>;
  onCancel?: () => void;
};

const TIMER_PRESETS = [10, 15, 20, 30, 45, 60] as const;
const MIN_TIME_LIMIT = 5;
const MAX_TIME_LIMIT = 120;

const clampTimeLimit = (value: number) => {
  if (!Number.isFinite(value)) return 30;
  return Math.min(MAX_TIME_LIMIT, Math.max(MIN_TIME_LIMIT, Math.round(value)));
};

const defaultConfig = (type: QuestionType): QuestionConfig => {
  switch (type) {
    case "single_choice":
      return {
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ],
        correctAnswer: "a",
      };
    case "multi_select":
      return {
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ],
        correctAnswers: ["a"],
      };
    case "image_choice":
      return {
        options: [
          { id: "a", imageUrl: "" },
          { id: "b", imageUrl: "" },
        ],
        correctAnswer: "a",
      };
    case "pin_image":
      return {
        imageUrl: "",
        correctArea: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
      };
    case "order":
      return {
        items: [
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
        ],
        correctOrder: ["a", "b"],
      };
    default:
      return {};
  }
};

export const QuestionEditor = ({
  initial,
  onSubmit,
  onCancel,
}: QuestionEditorProps) => {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "single_choice");
  const [questionText, setQuestionText] = useState(initial?.question_text ?? "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(initial?.media_url ?? null);
  const [config, setConfig] = useState<QuestionConfig>(
    initial?.config_json ?? defaultConfig("single_choice"),
  );
  const [timeLimit, setTimeLimit] = useState(
    clampTimeLimit(initial?.time_limit_seconds ?? 30),
  );
  const [points, setPoints] = useState(initial?.points ?? 1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (next: QuestionType) => {
    setType(next);
    setConfig(defaultConfig(next));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        type,
        question_text: questionText.trim(),
        media_url: mediaUrl,
        config_json: config,
        time_limit_seconds: clampTimeLimit(timeLimit),
        points,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const singleConfig = config as {
    options?: TextOption[];
    correctAnswer?: string;
    correctAnswers?: string[];
    items?: OrderItem[];
    correctOrder?: string[];
    imageUrl?: string;
    correctArea?: CorrectArea;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-festival-border bg-white p-5 shadow-card lg:grid lg:grid-cols-2 lg:gap-6"
    >
      <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-festival-navy">Type</span>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="rounded-md border border-festival-border px-3 py-2"
            aria-label="Question type"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-festival-navy">
            Time limit
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Timer presets">
            {TIMER_PRESETS.map((seconds) => {
              const selected = timeLimit === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setTimeLimit(seconds)}
                  aria-pressed={selected}
                  aria-label={`${seconds} seconds`}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    selected
                      ? "border-festival-saffron bg-festival-saffron text-white"
                      : "border-festival-border bg-white text-festival-navy hover:border-festival-saffron/50"
                  }`}
                >
                  {seconds}s
                </button>
              );
            })}
          </div>
          <Input
            label="Custom seconds"
            type="number"
            min={MIN_TIME_LIMIT}
            max={MAX_TIME_LIMIT}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            onBlur={() => setTimeLimit(clampTimeLimit(timeLimit))}
            aria-label="Custom time limit in seconds"
          />
          <p className="text-xs text-festival-muted">
            Applies to this question only. {MIN_TIME_LIMIT}–{MAX_TIME_LIMIT} seconds.
          </p>
        </div>
        <Input
          label="Points"
          type="number"
          min={0}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          aria-label="Points"
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-festival-navy">Question text</span>
        <textarea
          required
          rows={3}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="rounded-md border border-festival-border px-4 py-3"
          aria-label="Question text"
        />
      </label>

      {type !== "pin_image" ? (
        <ImageUploadField label="Question media (optional)" value={mediaUrl} onChange={setMediaUrl} />
      ) : null}
      </div>

      <div className="flex flex-col gap-4">
      {type === "single_choice" || type === "multi_select" ? (
        <OptionListEditor
          mode="text"
          options={singleConfig.options ?? []}
          multi={type === "multi_select"}
          correctId={singleConfig.correctAnswer}
          correctIds={singleConfig.correctAnswers}
          onChange={(options) => setConfig({ ...singleConfig, options })}
          onCorrectChange={(id) => setConfig({ ...singleConfig, correctAnswer: id })}
          onCorrectIdsChange={(ids) => setConfig({ ...singleConfig, correctAnswers: ids })}
        />
      ) : null}

      {type === "image_choice" ? (
        <OptionListEditor
          mode="image"
          options={singleConfig.options ?? []}
          correctId={singleConfig.correctAnswer}
          onChange={(options) => setConfig({ ...singleConfig, options })}
          onCorrectChange={(id) => setConfig({ ...singleConfig, correctAnswer: id })}
        />
      ) : null}

      {type === "pin_image" ? (
        <div className="space-y-3">
          <ImageUploadField
            label="Pin image"
            value={singleConfig.imageUrl || mediaUrl}
            onChange={(url) => {
              setMediaUrl(url);
              setConfig({
                ...singleConfig,
                imageUrl: url ?? "",
                correctArea: singleConfig.correctArea ?? {
                  x: 0.4,
                  y: 0.4,
                  width: 0.2,
                  height: 0.2,
                },
              });
            }}
          />
          {(singleConfig.imageUrl || mediaUrl) && singleConfig.correctArea ? (
            <AreaRegionEditor
              imageUrl={singleConfig.imageUrl || mediaUrl || ""}
              area={singleConfig.correctArea}
              onChange={(correctArea) =>
                setConfig({ ...singleConfig, correctArea })
              }
            />
          ) : null}
        </div>
      ) : null}

      {type === "order" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-festival-navy">
              Items (order = correct order)
            </span>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                const id = crypto.randomUUID().slice(0, 8);
                const items = [...(singleConfig.items ?? []), { id, text: "" }];
                setConfig({
                  ...singleConfig,
                  items,
                  correctOrder: items.map((i) => i.id),
                });
              }}
              aria-label="Add order item"
            >
              Add item
            </Button>
          </div>
          <ul className="space-y-2">
            {(singleConfig.items ?? []).map((item, index) => (
              <li key={item.id} className="flex gap-2">
                <span className="w-6 pt-3 text-sm text-festival-muted">{index + 1}</span>
                <Input
                  value={item.text}
                  onChange={(e) => {
                    const items = (singleConfig.items ?? []).map((i) =>
                      i.id === item.id ? { ...i, text: e.target.value } : i,
                    );
                    setConfig({
                      ...singleConfig,
                      items,
                      correctOrder: items.map((i) => i.id),
                    });
                  }}
                  aria-label={`Order item ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const items = (singleConfig.items ?? []).filter(
                      (i) => i.id !== item.id,
                    );
                    setConfig({
                      ...singleConfig,
                      items,
                      correctOrder: items.map((i) => i.id),
                    });
                  }}
                  aria-label={`Remove item ${index + 1}`}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-festival-danger">{error}</p> : null}

      <div className="flex gap-3 lg:col-span-2">
        <Button type="submit" disabled={loading || !questionText.trim()}>
          {loading ? "Saving…" : "Save question"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
      </div>
    </form>
  );
};
