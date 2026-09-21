import { useState } from "react";

type GamePinDisplayProps = {
  code: string;
};

export const GamePinDisplay = ({ code }: GamePinDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg bg-festival-navy px-8 py-10 text-center text-white shadow-elevated">
      <p className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-festival-gold">
        Game PIN
      </p>
      <p
        className="mt-3 font-sans text-6xl font-bold tracking-[0.25em] tabular-nums sm:text-7xl"
        aria-label={`Game PIN ${code.split("").join(" ")}`}
      >
        {code}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-4 font-sans text-sm text-white/70 underline hover:text-white"
        aria-label="Copy game PIN"
        tabIndex={0}
      >
        {copied ? "Copied!" : "Copy PIN"}
      </button>
    </div>
  );
};
