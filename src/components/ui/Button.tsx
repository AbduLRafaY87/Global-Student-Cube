import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-surface hover:bg-primary-hover active:bg-primary-pressed disabled:bg-neutral-200 disabled:text-text-muted",
  secondary:
    "border border-control-border bg-surface text-text hover:bg-neutral-100 active:bg-neutral-200 disabled:text-text-muted",
  destructive:
    "border border-critical bg-surface text-critical hover:bg-critical-bg active:bg-critical-bg disabled:text-text-muted",
  ghost:
    "bg-transparent text-text hover:bg-neutral-100 active:bg-neutral-200 disabled:text-text-muted",
};

export function Button({
  variant = "primary",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-base font-medium transition-colors duration-150 max-[899px]:w-full max-[899px]:min-w-0",
        VARIANT_CLASS[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
