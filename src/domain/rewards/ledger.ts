export const MENTORING_CREDIT_POINTS = 25;
export const REFERRAL_CREDIT_POINTS = 25;
export const REDEMPTION_MINIMUM = 500;
export const INACTIVITY_WARNING_MONTHS = 5;
export const INACTIVITY_EXPIRE_MONTHS = 6;
export const FRESH_AUTH_MINUTES = 10;
export const GIFT_CARD_DELIVERY = "10–12 working days";

export const POINT_EVENT_TYPES = [
  "earn_mentoring",
  "earn_referral",
  "reserve",
  "release",
  "redeem",
  "expire",
  "reversal",
] as const;
export type PointEventType = (typeof POINT_EVENT_TYPES)[number];

export const TIERS = ["none", "star", "silver", "gold", "platinum"] as const;
export type RewardTier = (typeof TIERS)[number];

export interface PointsEntry {
  eventType: PointEventType;
  points: number;
  sourceId: string;
}

export interface LedgerProjection {
  totalEarned: number;
  redeemed: number;
  expired: number;
  reserved: number;
  available: number;
  sessionCount: number;
  referralSubmittedCount: number;
  tier: RewardTier;
}

export function eventSign(eventType: PointEventType): 1 | -1 {
  if (
    eventType === "earn_mentoring" ||
    eventType === "earn_referral" ||
    eventType === "release" ||
    eventType === "reversal"
  ) {
    return 1;
  }
  return -1;
}

export function projectLedger(
  entries: PointsEntry[],
  uniqueVerifiedMentees: number,
): LedgerProjection {
  let totalEarned = 0;
  let redeemed = 0;
  let expired = 0;
  let reserved = 0;
  let sessionCount = 0;
  let referralSubmittedCount = 0;

  for (const entry of entries) {
    if (entry.eventType === "earn_mentoring") {
      totalEarned += entry.points;
      sessionCount += 1;
    } else if (entry.eventType === "earn_referral") {
      totalEarned += entry.points;
      referralSubmittedCount += 1;
    } else if (entry.eventType === "redeem") {
      redeemed += Math.abs(entry.points);
    } else if (entry.eventType === "expire") {
      expired += Math.abs(entry.points);
    } else if (entry.eventType === "reserve") {
      reserved += Math.abs(entry.points);
    } else if (entry.eventType === "release") {
      reserved = Math.max(0, reserved - entry.points);
    } else if (entry.eventType === "reversal") {
      totalEarned += entry.points;
    }
  }

  const available = totalEarned - redeemed - expired - reserved;
  return {
    totalEarned,
    redeemed,
    expired,
    reserved,
    available: Math.max(0, available),
    sessionCount,
    referralSubmittedCount,
    tier: tierFromUniqueMentees(uniqueVerifiedMentees),
  };
}

export function ledgerReconciles(
  entries: PointsEntry[],
  uniqueVerifiedMentees: number,
): boolean {
  const projected = projectLedger(entries, uniqueVerifiedMentees);
  const signedSum = entries.reduce((sum, entry) => {
    if (entry.eventType === "reserve" || entry.eventType === "release") {
      return sum;
    }
    return sum + (entry.eventType === "earn_mentoring" || entry.eventType === "earn_referral" || entry.eventType === "reversal"
      ? entry.points
      : -Math.abs(entry.points));
  }, 0);
  return signedSum - projected.reserved === projected.available;
}

export function tierFromUniqueMentees(count: number): RewardTier {
  if (count >= 25) {
    return "platinum";
  }
  if (count >= 15) {
    return "gold";
  }
  if (count >= 10) {
    return "silver";
  }
  if (count >= 5) {
    return "star";
  }
  return "none";
}

export function tenSessionsOneMenteeIsNotSilver(sessionCount: number, uniqueMentees: number): boolean {
  return sessionCount >= 10 && uniqueMentees === 1 && tierFromUniqueMentees(uniqueMentees) !== "silver";
}

export function canReserve(available: number, cost: number): boolean {
  return Number.isInteger(cost) && cost >= REDEMPTION_MINIMUM && available >= cost;
}

export function applyConcurrentReserves(available: number, costs: number[]): number[] {
  let remaining = available;
  const accepted: number[] = [];
  for (const cost of costs) {
    if (canReserve(remaining, cost)) {
      remaining -= cost;
      accepted.push(cost);
    }
  }
  return accepted;
}

export function rejectClientSubmittedTotals(body: Record<string, unknown>): boolean {
  const forbidden = [
    "totalEarned",
    "available",
    "redeemed",
    "expired",
    "reserved",
    "points",
    "tier",
    "sessionCount",
  ];
  return forbidden.some((key) => key in body);
}

export function addCalendarMonths(from: Date, months: number): Date {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + months;
  const day = from.getUTCDate();
  const target = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  target.setUTCHours(from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds());
  return target;
}

export function inactivityDeadline(lastActivity: Date, now: Date): {
  warn: boolean;
  expire: boolean;
} {
  return {
    warn: now.getTime() >= addCalendarMonths(lastActivity, INACTIVITY_WARNING_MONTHS).getTime(),
    expire: now.getTime() >= addCalendarMonths(lastActivity, INACTIVITY_EXPIRE_MONTHS).getTime(),
  };
}

export function hoursFromMinutes(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export function mentoringCreditIdempotency(bookingId: string): string {
  return `earn_mentoring:${bookingId}`;
}

export function referralCreditIdempotency(inviteeAccountId: string): string {
  return `earn_referral:${inviteeAccountId}`;
}

export function isGiftCardFulfillmentEnabled(flag: string | undefined): boolean {
  return flag === "1" || flag === "true";
}
