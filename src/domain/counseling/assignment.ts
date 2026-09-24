export const ASSIGNMENT_STATES = [
  "unassigned",
  "recommended",
  "active",
  "change_requested",
  "handoff_pending",
  "reassigned",
  "closed",
] as const;

export type AssignmentState = (typeof ASSIGNMENT_STATES)[number];

export const CHANGE_CATEGORIES = [
  "Service fit",
  "Scheduling",
  "Communication",
  "Other",
  "Safety",
] as const;

export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

export const CHANGE_DETAIL_MIN = 2;
export const CHANGE_DETAIL_MAX = 2000;

export function isChangeCategory(value: string): value is ChangeCategory {
  return (CHANGE_CATEGORIES as readonly string[]).includes(value);
}

export function validateChangeDetail(detail: string): boolean {
  const length = detail.trim().length;
  return length >= CHANGE_DETAIL_MIN && length <= CHANGE_DETAIL_MAX;
}

export function applyAssignmentEvent(
  current: AssignmentState,
  event:
    | "recommend"
    | "activate"
    | "request_change"
    | "start_handoff"
    | "reassign"
    | "decline"
    | "close",
): AssignmentState {
  const next =
    current === "unassigned" && event === "recommend"
      ? "recommended"
      : current === "recommended" && event === "activate"
        ? "active"
        : current === "unassigned" && event === "activate"
          ? "active"
          : current === "active" && event === "request_change"
            ? "change_requested"
            : current === "change_requested" && event === "start_handoff"
              ? "handoff_pending"
              : current === "handoff_pending" && event === "reassign"
                ? "reassigned"
                : current === "change_requested" && event === "decline"
                  ? "active"
                  : (current === "active" || current === "reassigned") &&
                      event === "close"
                    ? "closed"
                    : null;
  if (!next) {
    throw new Error(`Invalid assignment transition ${current} + ${event}`);
  }
  return next;
}

export function isProtectedSafety(category: ChangeCategory): boolean {
  return category === "Safety";
}

export function previousCounselorSees(args: {
  category: ChangeCategory;
  kind: "improvement_summary" | "protected_complaint" | "private_notes" | "future_booking";
}): boolean {
  if (args.kind === "protected_complaint") {
    return false;
  }
  if (args.kind === "private_notes" || args.kind === "future_booking") {
    return false;
  }
  return !isProtectedSafety(args.category);
}

export function nextCounselorSees(args: {
  kind: "approved_advisory" | "task" | "private_notes" | "authorized_history";
}): boolean {
  return args.kind !== "private_notes";
}

export function canReassignDuringSession(sessionState: string): boolean {
  return sessionState !== "waiting" && sessionState !== "in_progress";
}

export function counselorCanSeeCase(args: {
  hasActiveGrant: boolean;
  assignmentState: AssignmentState | null;
}): boolean {
  return args.hasActiveGrant && args.assignmentState === "active";
}

export function previousCounselorHistoryOnly(args: {
  assignmentState: AssignmentState;
  endedAt: string | null;
}): boolean {
  return (
    (args.assignmentState === "reassigned" || args.assignmentState === "closed") &&
    args.endedAt !== null
  );
}
