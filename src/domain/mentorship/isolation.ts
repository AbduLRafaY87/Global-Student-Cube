export interface CaseAccessInput {
  hasLiveGrant: boolean;
  hasMentorConnection: boolean;
  hasParentMentorConnection: boolean;
  mentorKind: "alumni" | "parent" | null;
}

export function mentorshipGrantsCaseAccess(): boolean {
  return false;
}

export function canReadStudentCase(input: CaseAccessInput): boolean {
  return input.hasLiveGrant;
}

export function mentorAndParentFamiliesIsolated(
  alumniTopics: readonly string[],
  parentTopics: readonly string[],
): boolean {
  const overlap = alumniTopics.filter((topic) => parentTopics.includes(topic));
  return overlap.length === 0;
}

export const PARENT_PUBLIC_FORBIDDEN_KEYS = [
  "childName",
  "childEducation",
  "familyFinances",
  "caseId",
  "transcript",
  "financeDisclosure",
] as const;

export function parentPublicCardOmitsChildData(
  card: Record<string, unknown>,
): boolean {
  return PARENT_PUBLIC_FORBIDDEN_KEYS.every((key) => !(key in card));
}

export function requestDoesNotGrantFinanceOrTranscript(
  requestAccepted: boolean,
  hasFinanceGrant: boolean,
  hasTranscriptGrant: boolean,
): boolean {
  if (!requestAccepted) {
    return !hasFinanceGrant && !hasTranscriptGrant;
  }
  return !hasFinanceGrant && !hasTranscriptGrant;
}

export const BOOKING_KINDS = ["counseling", "mentoring"] as const;

export function oneActiveMentoringAllowed(args: {
  existingActiveMentoring: number;
  kind: "counseling" | "mentoring";
}): boolean {
  if (args.kind === "counseling") {
    return true;
  }
  return args.existingActiveMentoring === 0;
}

export function activeBookingStatuses(): readonly string[] {
  return ["selected", "held", "confirmed"];
}
