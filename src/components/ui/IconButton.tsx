import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "md" | "lg";
  children: ReactNode;
}

export function IconButton({
  label,
  size = "lg",
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] text-text hover:bg-neutral-100 active:bg-neutral-200 disabled:text-text-muted",
        size === "lg" ? "size-12" : "size-11",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
