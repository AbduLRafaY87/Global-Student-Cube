import type { AgeBand } from "./age";

export const ACCOUNT_STATUSES = [
  "email_pending",
  "phone_pending",
  "guardian_pending",
  "review_pending",
  "approved",
  "rejected",
  "suspended",
  "deletion_pending",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** D2: skip phone verification and admin review. Adults activate after email. */
export function statusAfterEmailVerified(band: AgeBand): AccountStatus {
  if (band === "teen") {
    return "guardian_pending";
  }

  return "approved";
}

export function canAccessProtectedRoutes(
  emailVerified: boolean,
  status: AccountStatus | null,
): boolean {
  if (!emailVerified) {
    return false;
  }

  if (!status) {
    return false;
  }

  return status === "approved" || status === "guardian_pending";
}

export function isSuspended(status: AccountStatus | null): boolean {
  return status === "suspended";
}
