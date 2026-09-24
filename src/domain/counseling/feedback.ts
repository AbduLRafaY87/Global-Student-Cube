export const STUDENT_FEEDBACK_FIELDS = [
  "clarity",
  "helpfulness",
  "knowledge",
  "relevance",
  "overall",
] as const;

export const COUNSELOR_FEEDBACK_FIELDS = [
  "preparation",
  "document_readiness",
  "engagement",
  "goal_clarity",
] as const;

export const FEEDBACK_ANCHORS = [
  "Very poor",
  "Poor",
  "Neutral",
  "Good",
  "Excellent",
] as const;

export const FEEDBACK_STATES = [
  "draft",
  "submitted",
  "published_aggregate_eligible",
  "held",
  "eligible",
  "excluded",
] as const;

export type FeedbackState = (typeof FEEDBACK_STATES)[number];
export type FeedbackDirection = "student_to_counselor" | "counselor_to_student";

export const FEEDBACK_COMMENT_MAX = 2000;
export const MIN_PUBLISHED_RATERS = 5;
export const NEUTRAL_PUBLISHED_MEAN = 5;

export function canRateSession(args: {
  sessionState: string;
  attendanceOutcome: string | null;
}): boolean {
  return args.sessionState === "completed" && args.attendanceOutcome === null;
}

export function answersComplete(
  fields: readonly string[],
  answers: Record<string, number | undefined>,
): boolean {
  return fields.every((field) => {
    const value = answers[field];
    return value !== undefined && value >= 1 && value <= 5;
  });
}

export function publishedMean(args: {
  studentScores: readonly number[];
  counselorScores: readonly number[];
  eligibleCount: number;
}): number {
  if (args.eligibleCount < MIN_PUBLISHED_RATERS) {
    return NEUTRAL_PUBLISHED_MEAN;
  }
  if (args.studentScores.length === 0) {
    return NEUTRAL_PUBLISHED_MEAN;
  }
  const sum = args.studentScores.reduce((total, score) => total + score, 0);
  return sum / args.studentScores.length;
}

export function nextFeedbackState(
  current: FeedbackState,
  event: "submit" | "moderate_eligible" | "hold" | "exclude" | "release",
): FeedbackState {
  if (current === "draft" && event === "submit") {
    return "submitted";
  }
  if (current === "submitted" && event === "moderate_eligible") {
    return "published_aggregate_eligible";
  }
  if (current === "submitted" && event === "hold") {
    return "held";
  }
  if (current === "held" && event === "release") {
    return "eligible";
  }
  if (current === "held" && event === "exclude") {
    return "excluded";
  }
  throw new Error(`Invalid feedback transition ${current} + ${event}`);
}

export function countsTowardPublishedMean(args: {
  direction: FeedbackDirection;
  state: FeedbackState;
}): boolean {
  return (
    args.direction === "student_to_counselor" &&
    (args.state === "published_aggregate_eligible" || args.state === "eligible")
  );
}
