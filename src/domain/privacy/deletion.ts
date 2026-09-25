export const DELETION_STEPS = [
  "suspend_access",
  "revoke_sessions_and_grants",
  "hide_public_projections",
  "cancel_queued_notices",
  "stop_new_processing",
  "inventory_targets",
  "delete_or_pseudonymize",
] as const;

export type DeletionStep = (typeof DELETION_STEPS)[number];

export const RETAINED_AFTER_DELETION = [
  "reward_entries",
  "audit_events",
  "consent_events",
] as const;

export interface LegalHold {
  resourceType: string;
  resourceId: string;
  authority: string;
  reason: string;
  reviewAt: string;
  releasedAt: string | null;
}

export function deletionBlockedByHold(holds: readonly LegalHold[]): boolean {
  return holds.some((hold) => hold.releasedAt === null);
}

export function nextDeletionStep(completed: readonly DeletionStep[]): DeletionStep | null {
  for (const step of DELETION_STEPS) {
    if (!completed.includes(step)) {
      return step;
    }
  }
  return null;
}

export function canPseudonymizeLedgers(args: {
  holds: readonly LegalHold[];
  now: string;
  dueAt: string;
}): boolean {
  if (deletionBlockedByHold(args.holds)) {
    return false;
  }
  return Date.parse(args.now) >= Date.parse(args.dueAt);
}

export function deletionRemovesOtherPersonData(): boolean {
  return false;
}

export function retainedCollectionsAfterErasure(): readonly string[] {
  return RETAINED_AFTER_DELETION;
}

export function deletionOrder(): readonly DeletionStep[] {
  return DELETION_STEPS;
}
