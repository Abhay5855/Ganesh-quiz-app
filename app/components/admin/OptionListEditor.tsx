import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { ImageUploadField } from "./ImageUploadField";
import type { TextOption } from "~/types/questions";

type OptionListEditorProps = {
  options: TextOption[];
  onChange: (options: TextOption[]) => void;
  mode: "text" | "image";
  correctId?: string | null;
  correctIds?: string[];
  multi?: boolean;
  onCorrectChange?: (id: string) => void;
  onCorrectIdsChange?: (ids: string[]) => void;
};

const newId = () => crypto.randomUUID().slice(0, 8);

export const OptionListEditor = ({
  options,
  onChange,
  mode,
  correctId,
  correctIds = [],
  multi,
  onCorrectChange,
  onCorrectIdsChange,
}: OptionListEditorProps) => {
  const handleAdd = () => {
    onChange([
      ...options,
      mode === "text"
        ? { id: newId(), text: "" }
        : { id: newId(), imageUrl: "" },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Options</span>
        <Button size="sm" variant="secondary" onClick={handleAdd} aria-label="Add option">
          Add option
        </Button>
      </div>
      <ul className="space-y-3">
        {options.map((option, index) => (
          <li
            key={option.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3"
          >
            <div className="flex items-center gap-2">
              {multi ? (
                <input
                  type="checkbox"
                  checked={correctIds.includes(option.id)}
                  onChange={() => {
                    const next = correctIds.includes(option.id)
                      ? correctIds.filter((id) => id !== option.id)
                      : [...correctIds, option.id];
                    onCorrectIdsChange?.(next);
                  }}
                  aria-label={`Mark option ${index + 1} correct`}
                />
              ) : (
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctId === option.id}
                  onChange={() => onCorrectChange?.(option.id)}
                  aria-label={`Mark option ${index + 1} correct`}
                />
              )}
              <span className="text-xs font-mono text-slate-400">{option.id}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange(options.filter((o) => o.id !== option.id))}
                aria-label={`Remove option ${index + 1}`}
              >
                Remove
              </Button>
            </div>
            {mode === "text" ? (
              <Input
                value={option.text ?? ""}
                onChange={(e) =>
                  onChange(
                    options.map((o) =>
                      o.id === option.id ? { ...o, text: e.target.value } : o,
                    ),
                  )
                }
                aria-label={`Option ${index + 1} text`}
                placeholder="Option text"
              />
            ) : (
              <ImageUploadField
                label={`Option ${index + 1} image`}
                value={option.imageUrl}
                onChange={(url) =>
                  onChange(
                    options.map((o) =>
                      o.id === option.id ? { ...o, imageUrl: url ?? "" } : o,
                    ),
                  )
                }
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
