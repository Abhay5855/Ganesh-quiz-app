import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className = "" }: CardProps) => (
  <div
    className={`rounded-lg border border-festival-border bg-white p-5 shadow-card ${className}`}
  >
    {children}
  </div>
);
