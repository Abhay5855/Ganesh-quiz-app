import type { ReactNode } from "react";

type ParticipantShellProps = {
  children: ReactNode;
  className?: string;
  /** Quieter motif for question screens */
  subtle?: boolean;
};

export const ParticipantShell = ({
  children,
  className = "",
  subtle = false,
}: ParticipantShellProps) => (
  <div
    className={`safe-pad min-h-dvh bg-festival-cream ${
      subtle ? "participant-motif-subtle" : "participant-motif"
    }`}
  >
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-[26.25rem] flex-col px-4 py-6 ${className}`}
    >
      {children}
    </div>
  </div>
);
