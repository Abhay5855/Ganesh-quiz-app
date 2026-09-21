import { useId, useRef, type ChangeEvent, type KeyboardEvent } from "react";

type GamePinInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
};

const digitsOnly = (raw: string) => raw.replace(/\D/g, "").slice(0, 6);

export const GamePinInput = ({
  value,
  onChange,
  error,
  disabled,
}: GamePinInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const filled = value.length;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(digitsOnly(event.target.value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") return;
  };

  const handleFocusControl = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-festival-navy">
        Game PIN
      </label>
      <div
        role="group"
        aria-label="Six-digit game PIN"
        className={`relative grid grid-cols-6 gap-2 rounded-md p-1 ${
          error
            ? "ring-2 ring-festival-danger/40"
            : "focus-within:ring-2 focus-within:ring-festival-saffron/40"
        }`}
        onClick={handleFocusControl}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            handleFocusControl();
          }
        }}
      >
        {digits.map((digit, index) => (
          <div
            key={`${id}-cell-${index}`}
            aria-hidden
            className={`flex h-14 items-center justify-center rounded-md border-2 bg-white font-sans text-2xl font-bold tabular-nums ${
              index === filled && filled < 6
                ? "border-festival-saffron"
                : digit.trim()
                  ? "border-festival-navy text-festival-navy"
                  : "border-festival-border text-festival-muted"
            }`}
          >
            {digit.trim() ? digit : ""}
          </div>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
          style={{ fontSize: 16 }}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-festival-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
