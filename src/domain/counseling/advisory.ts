export const ADVISORY_STATES = [
  "awaiting_summary",
  "draft",
  "counselor_review",
  "admin_review",
  "changes_requested",
  "approved",
  "delivered",
  "withdrawn",
] as const;

export type AdvisoryState = (typeof ADVISORY_STATES)[number];

export const ADVISORY_EVENTS = [
  "start_draft",
  "submit_review",
  "flag_quality",
  "request_changes",
  "approve",
  "deliver",
  "supersede",
] as const;

export type AdvisoryEvent = (typeof ADVISORY_EVENTS)[number];

export const PRIVATE_NOTES_MAX = 4000;
export const GAP_MAX = 2000;
export const FIT_RATIONALE_MAX = 2000;
export const ADVISORY_DUE_HOURS = 24;
export const ADVISORY_ESCALATE_HOURS = 48;

export const FIT_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  5: "Excellent fit / Highly recommended",
  4: "Good fit / Recommended",
  3: "Moderate fit / Needs review",
  2: "Low fit / Not strongly recommended",
  1: "Very poor fit / Not recommended",
};

export const ADVISORY_DISCLAIMER =
  "This guidance is indicative, not an admission or visa guarantee.";

export const ADVISORY_TRANSITIONS: Record<
  AdvisoryState,
  Partial<Record<AdvisoryEvent, AdvisoryState>>
> = {
  awaiting_summary: { start_draft: "draft" },
  draft: { submit_review: "counselor_review" },
  counselor_review: {
    approve: "approved",
    flag_quality: "admin_review",
  },
  admin_review: {
    approve: "approved",
    request_changes: "changes_requested",
  },
  changes_requested: { start_draft: "draft" },
  approved: { deliver: "delivered", supersede: "withdrawn" },
  delivered: { supersede: "withdrawn" },
  withdrawn: {},
};

export function applyAdvisoryEvent(
  current: AdvisoryState,
  event: AdvisoryEvent,
  qualityFlagged = false,
): AdvisoryState {
  if (event === "approve" && current === "counselor_review" && qualityFlagged) {
    throw new Error("Quality-flagged advisories require admin review");
  }
  const next = ADVISORY_TRANSITIONS[current][event];
  if (!next) {
    throw new Error(`Invalid advisory transition ${current} + ${event}`);
  }
  return next;
}

export function canApplyAdvisoryEvent(
  current: AdvisoryState,
  event: AdvisoryEvent,
  qualityFlagged = false,
): boolean {
  if (event === "approve" && current === "counselor_review" && qualityFlagged) {
    return false;
  }
  return ADVISORY_TRANSITIONS[current][event] !== undefined;
}

export function studentVisibleAdvisory(state: AdvisoryState): boolean {
  return state === "approved" || state === "delivered";
}

export function studentAdvisoryLabel(state: AdvisoryState): string {
  if (studentVisibleAdvisory(state)) {
    return "Approved advisory";
  }
  return "Counselor reviewing";
}

export function advisoryDueAt(completedAt: string): Date {
  return new Date(Date.parse(completedAt) + ADVISORY_DUE_HOURS * 60 * 60 * 1000);
}

export function advisoryEscalateAt(completedAt: string): Date {
  return new Date(Date.parse(completedAt) + ADVISORY_ESCALATE_HOURS * 60 * 60 * 1000);
}

export function isAdvisoryOverdue(completedAt: string, now: string): boolean {
  return Date.parse(now) >= advisoryDueAt(completedAt).getTime();
}

export function isAdvisoryEscalated(completedAt: string, now: string): boolean {
  return Date.parse(now) >= advisoryEscalateAt(completedAt).getTime();
}

export function assertShareableLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function shareableContainsPrivate(
  shareable: string,
  privateNotes: string,
): boolean {
  const secret = privateNotes.trim();
  return secret.length > 0 && shareable.includes(secret);
}

export function fitScoreIsNotAssessmentPercent(fit: number, assessmentPercent: number): boolean {
  return fit !== assessmentPercent;
}
