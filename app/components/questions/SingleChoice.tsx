import type { TextOption } from "~/types/questions";

type SingleChoiceProps = {
  options: TextOption[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
};

export const SingleChoice = ({
  options,
  selectedId,
  disabled,
  onSelect,
}: SingleChoiceProps) => (
  <ul className="flex flex-col gap-3" role="radiogroup" aria-label="Answer choices">
    {options.map((option) => {
      const selected = option.id === selectedId;
      return (
        <li key={option.id}>
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            tabIndex={0}
            aria-label={option.text ?? option.id}
            onClick={() => onSelect(option.id)}
            className={`min-h-14 w-full rounded-lg border-2 px-4 py-4 text-left font-sans text-base font-medium transition ${
              selected
                ? "border-festival-saffron bg-festival-navy text-white"
                : "border-festival-border bg-white text-festival-navy hover:border-festival-saffron/50"
            } disabled:opacity-60`}
          >
            {option.text}
          </button>
        </li>
      );
    })}
  </ul>
);
