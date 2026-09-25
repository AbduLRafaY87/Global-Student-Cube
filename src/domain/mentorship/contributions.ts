export const MENTORING_POINTS = 25;
export const LEADERBOARD_SIZE = 10;
export const RATING_AGGREGATE_MIN_RATERS = 5;

export const LOG_STATES = [
  "draft",
  "submitted",
  "changes_requested",
  "rejected",
  "approved",
  "approved_awaiting_rating",
  "reward_eligible",
  "credited",
] as const;
export type MentoringLogState = (typeof LOG_STATES)[number];

export interface ContributionSession {
  menteeId: string;
  minutes: number;
  logState: MentoringLogState;
  hasRating: boolean;
}

export function isVerifiedContribution(session: ContributionSession): boolean {
  return (
    session.hasRating &&
    (session.logState === "approved" ||
      session.logState === "approved_awaiting_rating" ||
      session.logState === "reward_eligible" ||
      session.logState === "credited")
  );
}

export function countUniqueMentees(sessions: ContributionSession[]): number {
  const ids = new Set<string>();
  for (const session of sessions) {
    if (isVerifiedContribution(session)) {
      ids.add(session.menteeId);
    }
  }
  return ids.size;
}

export function verifiedSessionCount(sessions: ContributionSession[]): number {
  return sessions.filter(isVerifiedContribution).length;
}

export function verifiedMinutes(sessions: ContributionSession[]): number {
  return sessions
    .filter(isVerifiedContribution)
    .reduce((sum, session) => sum + session.minutes, 0);
}

export function spendablePoints(sessions: ContributionSession[]): number {
  return sessions.filter((session) => session.logState === "credited").length * MENTORING_POINTS;
}

export function pendingApprovalPoints(sessions: ContributionSession[]): number {
  return (
    sessions.filter(
      (session) =>
        session.logState === "submitted" ||
        session.logState === "approved" ||
        session.logState === "approved_awaiting_rating" ||
        session.logState === "reward_eligible",
    ).length * MENTORING_POINTS
  );
}

export function nextLogStateAfterAdmin(args: {
  decision: "approved" | "rejected" | "changes_requested";
  hasRating: boolean;
}): MentoringLogState {
  if (args.decision === "rejected") {
    return "rejected";
  }
  if (args.decision === "changes_requested") {
    return "changes_requested";
  }
  if (!args.hasRating) {
    return "approved_awaiting_rating";
  }
  return "reward_eligible";
}

export function applyRatingToLog(state: MentoringLogState): MentoringLogState {
  if (state === "approved_awaiting_rating") {
    return "reward_eligible";
  }
  return state;
}

export function creditOnce(state: MentoringLogState): MentoringLogState {
  if (state === "reward_eligible") {
    return "credited";
  }
  return state;
}

export interface LeaderboardRow {
  mentorId: string;
  rating: number | null;
  uniqueMentees: number;
  verifiedMinutes: number;
}

export function sortLeaderboard(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort((left, right) => {
    const leftRating = left.rating ?? -1;
    const rightRating = right.rating ?? -1;
    if (rightRating !== leftRating) {
      return rightRating - leftRating;
    }
    if (right.uniqueMentees !== left.uniqueMentees) {
      return right.uniqueMentees - left.uniqueMentees;
    }
    if (right.verifiedMinutes !== left.verifiedMinutes) {
      return right.verifiedMinutes - left.verifiedMinutes;
    }
    return left.mentorId.localeCompare(right.mentorId);
  });
}

export function topTen(rows: LeaderboardRow[]): LeaderboardRow[] {
  return sortLeaderboard(rows).slice(0, LEADERBOARD_SIZE);
}

export function publishedAggregateRating(
  sessionMeans: number[],
  distinctRaters: number,
): number | null {
  if (distinctRaters < RATING_AGGREGATE_MIN_RATERS || sessionMeans.length === 0) {
    return null;
  }
  const sum = sessionMeans.reduce((total, value) => total + value, 0);
  return sum / sessionMeans.length;
}

export const FOUR_OPTION_SCORES = [5, 11 / 3, 7 / 3, 1] as const;
export const FIVE_OPTION_SCORES = [5, 4, 3, 2, 1] as const;

export function normalizeFourOption(index: number): number {
  return FOUR_OPTION_SCORES[index] ?? 1;
}

export function normalizeFiveOption(index: number): number {
  return FIVE_OPTION_SCORES[index] ?? 1;
}
