import { GaneshMascot, type MascotPose } from "./GaneshMascot";

type StatusMessageProps = {
  title: string;
  description?: string;
  tone?: "neutral" | "danger" | "warning" | "success";
  pose?: MascotPose;
};

const toneClass: Record<NonNullable<StatusMessageProps["tone"]>, string> = {
  neutral: "border-festival-border bg-white text-festival-navy",
  danger: "border-festival-danger/30 bg-festival-danger/5 text-festival-maroon",
  warning: "border-festival-gold/40 bg-festival-gold/10 text-festival-maroon",
  success: "border-festival-success/30 bg-festival-success/10 text-festival-navy",
};

export const StatusMessage = ({
  title,
  description,
  tone = "neutral",
  pose,
}: StatusMessageProps) => (
  <div
    className={`rounded-lg border px-4 py-5 text-center shadow-card ${toneClass[tone]}`}
    role="status"
    aria-live="polite"
  >
    {pose ? <GaneshMascot pose={pose} size="sm" className="mb-3" /> : null}
    <p className="font-display text-xl font-bold">{title}</p>
    {description ? (
      <p className="mt-2 font-sans text-sm text-festival-muted">{description}</p>
    ) : null}
  </div>
);
