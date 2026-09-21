import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-festival-saffron text-white hover:bg-festival-saffron-hover focus-visible:ring-festival-saffron disabled:bg-festival-gold disabled:text-festival-navy/50",
  secondary:
    "border border-festival-saffron bg-white text-festival-saffron hover:bg-festival-cream-soft focus-visible:ring-festival-saffron disabled:border-festival-muted disabled:text-festival-muted",
  danger:
    "bg-festival-danger text-white hover:bg-festival-danger-hover focus-visible:ring-festival-danger disabled:bg-festival-muted",
  ghost:
    "bg-transparent text-festival-navy hover:bg-festival-cream-soft focus-visible:ring-festival-muted disabled:text-festival-muted",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-10 px-3 py-2 text-sm font-semibold",
  md: "min-h-12 px-4 py-3 text-base font-semibold",
  lg: "min-h-14 px-6 py-4 text-base font-semibold",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center rounded-md font-sans transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-festival-cream disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    {...props}
  />
);
