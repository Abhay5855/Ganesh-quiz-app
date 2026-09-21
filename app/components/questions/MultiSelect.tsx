import { useEffect, useState } from "react";
import type { TextOption } from "~/types/questions";

type MultiSelectProps = {
  options: TextOption[];
  selectedIds: string[];
  disabled?: boolean;
  onToggle: (id: string) => void;
};

const SHORT_LABEL_MAX = 28;

export const MultiSelect = ({
  options,
  selectedIds,
  disabled,
  onToggle,
}: MultiSelectProps) => {
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    const update = () => setWideEnough(window.innerWidth >= 360);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const labelsShort = options.every(
    (option) => (option.text?.length ?? 0) <= SHORT_LABEL_MAX,
  );
  const noMedia = options.every((option) => !option.imageUrl);
  const useGrid =
    options.length >= 4 && labelsShort && noMedia && wideEnough;

  return (
    <div className="space-y-3">
      <p className="font-sans text-sm font-medium text-festival-muted">
        Select all that apply
      </p>
      <ul
        className={useGrid ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}
        aria-label="Select all that apply"
      >
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                disabled={disabled}
                tabIndex={0}
                aria-label={option.text ?? option.id}
                onClick={() => onToggle(option.id)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-4 text-left font-sans text-base font-medium transition ${
                  selected
                    ? "border-festival-saffron bg-festival-cream-soft text-festival-navy"
                    : "border-festival-border bg-white text-festival-navy hover:border-festival-saffron/50"
                } disabled:opacity-60`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 font-sans text-sm ${
                    selected
                      ? "border-festival-saffron bg-festival-saffron text-white"
                      : "border-festival-border"
                  }`}
                  aria-hidden
                >
                  {selected ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">{option.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
