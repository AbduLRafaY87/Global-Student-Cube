export const TASK_STATES = [
  "open",
  "in_progress",
  "submitted",
  "changes_requested",
  "completed",
  "cancelled",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

export const TASK_OWNERS = ["Student", "Parent", "Counselor"] as const;
export type TaskOwnerRole = (typeof TASK_OWNERS)[number];

export const TASK_DESCRIPTION_MAX = 2000;
export const AWAITING_DATE_LABEL = "Date requested";

export function applyTaskEvent(
  current: TaskState,
  event:
    | "start"
    | "submit"
    | "request_changes"
    | "complete"
    | "cancel"
    | "resubmit",
): TaskState {
  const next =
    current === "open" && event === "start"
      ? "in_progress"
      : current === "in_progress" && event === "submit"
        ? "submitted"
        : current === "open" && event === "submit"
          ? "submitted"
          : current === "submitted" && event === "complete"
            ? "completed"
            : current === "submitted" && event === "request_changes"
              ? "changes_requested"
              : current === "changes_requested" && event === "resubmit"
                ? "submitted"
                : current !== "completed" && event === "cancel"
                  ? "cancelled"
                  : null;
  if (!next) {
    throw new Error(`Invalid task transition ${current} + ${event}`);
  }
  return next;
}

export function dueLabel(dueAt: string | null): string {
  return dueAt ? dueAt : AWAITING_DATE_LABEL;
}

export function isOverdue(dueAt: string | null, now: string): boolean {
  if (!dueAt) {
    return false;
  }
  return Date.parse(now) > Date.parse(dueAt);
}

export function extendDue(args: {
  previousDueAt: string | null;
  nextDueAt: string;
  reason: string;
}): { previousDueAt: string | null; nextDueAt: string; reason: string } {
  return {
    previousDueAt: args.previousDueAt,
    nextDueAt: args.nextDueAt,
    reason: args.reason,
  };
}

export function completionCancelsReminders(state: TaskState): boolean {
  return state === "completed";
}
