import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = ({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) => {
  const inputId = id ?? props.name;

  return (
    <label className="flex w-full flex-col gap-1.5 text-left font-sans">
      {label ? (
        <span className="text-sm font-medium text-festival-navy">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={`w-full rounded-md border border-festival-border bg-white px-4 py-3 text-base text-festival-navy placeholder:text-festival-muted focus:border-festival-saffron focus:outline-none focus:ring-2 focus:ring-festival-saffron/25 disabled:bg-festival-cream-soft ${className}`}
        {...props}
      />
      {error ? (
        <span className="text-sm text-festival-danger">{error}</span>
      ) : null}
    </label>
  );
};
