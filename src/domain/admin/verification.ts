export const VERIFICATION_STATES = [
  "pending",
  "approved",
  "rejected",
  "needs_information",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const VERIFICATION_KINDS = [
  "counselor",
  "mentor",
  "company",
  "guardian_link",
] as const;

export type VerificationKind = (typeof VERIFICATION_KINDS)[number];

export const VERIFICATION_DECISIONS = [
  "approved",
  "rejected",
  "needs_information",
] as const;

export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export const PROFESSIONAL_KINDS: readonly VerificationKind[] = [
  "counselor",
  "mentor",
  "company",
];

export const ESCALATION_AFTER_DAYS = 7;

export function isVerificationState(value: string): value is VerificationState {
  return (VERIFICATION_STATES as readonly string[]).includes(value);
}

export function isVerificationKind(value: string): value is VerificationKind {
  return (VERIFICATION_KINDS as readonly string[]).includes(value);
}

export function isVerificationDecision(
  value: string,
): value is VerificationDecision {
  return (VERIFICATION_DECISIONS as readonly string[]).includes(value);
}

export function kindFromAccountRole(role: string): VerificationKind | null {
  if (role === "counselor") {
    return "counselor";
  }
  if (role === "mentor" || role === "alumni") {
    return "mentor";
  }
  return null;
}

export function isOpenVerificationState(state: string): boolean {
  return state === "pending" || state === "needs_information";
}

export function decisionRequiresReason(decision: VerificationDecision): boolean {
  return decision === "rejected" || decision === "approved";
}

export function escalationDueAt(submittedAt: Date, now = submittedAt): Date {
  const due = new Date(submittedAt.getTime());
  due.setUTCDate(due.getUTCDate() + ESCALATION_AFTER_DAYS);
  return due < now ? now : due;
}

export function isEscalationDue(escalatesAt: Date, now: Date): boolean {
  return escalatesAt.getTime() <= now.getTime();
}

export function counselorIsProspectivelyAvailable(args: {
  accountStatus: string;
  hasCounselorRole: boolean;
  verificationState: string | null;
}): boolean {
  return (
    args.accountStatus === "approved" &&
    args.hasCounselorRole &&
    args.verificationState === "approved"
  );
}
