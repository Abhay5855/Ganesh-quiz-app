type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "live";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-festival-cream-soft text-festival-navy",
  success: "bg-festival-success/15 text-festival-success",
  warning: "bg-festival-gold/30 text-festival-maroon",
  danger: "bg-festival-danger/10 text-festival-danger",
  live: "bg-festival-saffron/15 text-festival-saffron",
};

export const Badge = ({ children, tone = "neutral" }: BadgeProps) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold ${tones[tone]}`}
  >
    {children}
  </span>
);
