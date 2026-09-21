import type { TextOption } from "~/types/questions";

type ImageChoiceProps = {
  options: TextOption[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
};

export const ImageChoice = ({
  options,
  selectedId,
  disabled,
  onSelect,
}: ImageChoiceProps) => (
  <ul
    className="grid grid-cols-2 gap-3"
    role="radiogroup"
    aria-label="Image choices"
  >
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
            aria-label={option.text ? option.text : `Option ${option.id}`}
            onClick={() => onSelect(option.id)}
            className={`relative w-full overflow-hidden rounded-lg border-2 transition ${
              selected
                ? "border-festival-saffron bg-festival-cream-soft ring-2 ring-festival-saffron/30"
                : "border-festival-border bg-white hover:border-festival-saffron/40"
            } disabled:opacity-60`}
          >
            <div className="aspect-[4/3] bg-festival-cream-soft">
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center font-sans text-sm text-festival-muted">
                  No image
                </div>
              )}
            </div>
            {selected ? (
              <span
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-festival-saffron font-sans text-sm font-bold text-white shadow-card"
                aria-hidden
              >
                ✓
              </span>
            ) : null}
            {option.text ? (
              <p className="border-t border-festival-border px-2 py-2 text-center font-sans text-sm font-medium text-festival-navy">
                {option.text}
              </p>
            ) : null}
          </button>
        </li>
      );
    })}
  </ul>
);
