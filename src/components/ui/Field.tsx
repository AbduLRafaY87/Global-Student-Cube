import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-label font-medium text-text">
        {label}
        {required ? <span className="text-critical"> *</span> : null}
        {optional ? (
          <span className="ml-1 font-normal text-text-muted">(Optional)</span>
        ) : null}
      </label>
      <div className="mt-2" data-describedby={describedBy}>
        {children}
      </div>
      {error ? (
        <p
          id={errorId}
          className="mt-1 flex items-start gap-2 text-sm leading-5 text-critical"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs leading-[18px] text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function controlClassName(invalid?: boolean): string {
  return [
    "h-12 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-base text-text",
    invalid ? "border-critical" : "border-control-border",
  ].join(" ");
}
