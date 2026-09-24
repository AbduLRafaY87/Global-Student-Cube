import { MICROCOPY } from "@/domain/microcopy";
import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  filtered?: boolean;
  onResetFilters?: () => void;
}

export function EmptyState({
  title = "Nothing here yet",
  message,
  action,
  filtered = false,
  onResetFilters,
}: EmptyStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">
        {message ??
          (filtered ? MICROCOPY.filteredEmpty : MICROCOPY.emptySaved)}
      </p>
      {filtered && onResetFilters ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onResetFilters}>
            Clear filters
          </Button>
        </div>
      ) : action ? (
        <div className="mt-4">{action}</div>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = MICROCOPY.loading }: { label?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <p className="sr-only">{label}</p>
      <div className="h-4 w-1/3 rounded bg-neutral-200" />
      <div className="h-24 rounded-[var(--radius-card)] bg-neutral-100" />
      <div className="h-24 rounded-[var(--radius-card)] bg-neutral-100" />
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = MICROCOPY.retryableError,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-critical bg-critical-bg p-6" role="alert">
      <p className="text-sm text-critical">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ForbiddenState({
  message = MICROCOPY.forbidden,
}: {
  message?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6" role="alert">
      <p className="text-sm text-text">{message}</p>
    </div>
  );
}
