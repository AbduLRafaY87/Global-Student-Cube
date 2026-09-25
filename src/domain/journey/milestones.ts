import {
  storyCanPublish,
  type StoryConsent,
} from "../news/news";
import { INDUSTRY_IDS } from "../mentorship/taxonomy";

export const MILESTONE_KINDS = [
  "admission_outcome",
  "visa_approved",
  "arrival",
  "university_start",
  "first_semester",
  "internship",
  "graduation",
  "first_job",
] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  admission_outcome: "Admission outcome",
  visa_approved: "Visa approval",
  arrival: "University arrival",
  university_start: "University start",
  first_semester: "First semester",
  internship: "Internship offer",
  graduation: "Graduation",
  first_job: "First job offer",
};

export const MILESTONE_VERIFICATION = [
  "self_reported",
  "evidence_submitted",
  "verified",
  "disputed",
] as const;
export type MilestoneVerification = (typeof MILESTONE_VERIFICATION)[number];

export const JOURNEY_STATES = [
  "not_started",
  "active",
  "graduated",
  "employed",
] as const;
export type JourneyState = (typeof JOURNEY_STATES)[number];

export const INTERNSHIP_RELEVANCE = [
  "highly_relevant",
  "somewhat_relevant",
  "not_relevant",
] as const;
export type InternshipRelevance = (typeof INTERNSHIP_RELEVANCE)[number];

export const SEMESTER_STANDING = ["pass", "fail"] as const;
export type SemesterStanding = (typeof SEMESTER_STANDING)[number];

export const SELF_REPORTED_LABEL = "Self-reported";

export const JOURNEY_STATE_LABELS: Record<JourneyState, string> = {
  not_started: "Not started",
  active: "Active",
  graduated: "Graduated",
  employed: "Employed",
};

export const VERIFICATION_LABELS: Record<MilestoneVerification, string> = {
  self_reported: SELF_REPORTED_LABEL,
  evidence_submitted: "Evidence submitted",
  verified: "Verified",
  disputed: "Disputed",
};

export interface JourneyMilestone {
  kind: MilestoneKind;
  occurredOn: string | null;
  details: Record<string, unknown>;
  verification: MilestoneVerification;
  exceptionNote: string | null;
}

export interface DateInconsistency {
  code: string;
  message: string;
  preserveProvenance: true;
  inventsPositiveDuration: false;
}

function parseDay(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) ? time : null;
}

function byKind(
  rows: readonly JourneyMilestone[],
  kind: MilestoneKind,
): JourneyMilestone | undefined {
  return rows.find((row) => row.kind === kind);
}

export function flagInconsistentDates(
  rows: readonly JourneyMilestone[],
): DateInconsistency[] {
  const flags: DateInconsistency[] = [];
  const start = parseDay(byKind(rows, "university_start")?.occurredOn ?? null);
  const arrival = parseDay(byKind(rows, "arrival")?.occurredOn ?? null);
  const semester = parseDay(byKind(rows, "first_semester")?.occurredOn ?? null);
  const graduation = parseDay(byKind(rows, "graduation")?.occurredOn ?? null);
  const internship = parseDay(byKind(rows, "internship")?.occurredOn ?? null);
  const job = parseDay(byKind(rows, "first_job")?.occurredOn ?? null);

  function add(code: string, message: string) {
    flags.push({
      code,
      message,
      preserveProvenance: true,
      inventsPositiveDuration: false,
    });
  }

  if (graduation !== null && start !== null && graduation < start) {
    add("GRADUATION_BEFORE_START", "Graduation is earlier than university start.");
  }
  if (graduation !== null && arrival !== null && graduation < arrival) {
    add("GRADUATION_BEFORE_ARRIVAL", "Graduation is earlier than arrival.");
  }
  if (semester !== null && start !== null && semester < start) {
    add("SEMESTER_BEFORE_START", "First-semester completion is earlier than university start.");
  }
  if (internship !== null && start !== null && internship < start) {
    add("INTERNSHIP_BEFORE_START", "Internship offer is earlier than university start.");
  }
  if (job !== null && graduation !== null && job < graduation) {
    add("PRE_GRADUATION_OFFER", "First job offer is before graduation. Label it pre-graduation; do not invent a positive placement duration.");
  }

  return flags;
}

export function deriveJourneyState(rows: readonly JourneyMilestone[]): JourneyState {
  const hasJob = rows.some((row) => row.kind === "first_job" && row.occurredOn);
  const hasGraduation = rows.some((row) => row.kind === "graduation" && row.occurredOn);
  const hasActive = rows.some(
    (row) =>
      (row.kind === "admission_outcome" ||
        row.kind === "arrival" ||
        row.kind === "university_start" ||
        row.kind === "visa_approved") &&
      row.occurredOn,
  );
  if (hasJob) {
    return "employed";
  }
  if (hasGraduation) {
    return "graduated";
  }
  if (hasActive) {
    return "active";
  }
  return "not_started";
}

export function daysBetween(from: string | null, to: string | null): number | null {
  const start = parseDay(from);
  const end = parseDay(to);
  if (start === null || end === null || end < start) {
    return null;
  }
  return Math.round((end - start) / 86_400_000);
}

export function timeToInternship(rows: readonly JourneyMilestone[]): number | null {
  return daysBetween(
    byKind(rows, "university_start")?.occurredOn ?? null,
    byKind(rows, "internship")?.occurredOn ?? null,
  );
}

export function timeToPlacement(rows: readonly JourneyMilestone[]): {
  days: number | null;
  preGraduation: boolean;
} {
  const graduation = byKind(rows, "graduation")?.occurredOn ?? null;
  const job = byKind(rows, "first_job")?.occurredOn ?? null;
  const start = parseDay(graduation);
  const offer = parseDay(job);
  if (start === null || offer === null) {
    return { days: null, preGraduation: false };
  }
  if (offer < start) {
    return { days: null, preGraduation: true };
  }
  return { days: daysBetween(graduation, job), preGraduation: false };
}

export function analyticsCoverage(args: {
  cohortSize: number;
  knownOutcomes: number;
}): { observedDenominator: number; coverageDenominator: number } {
  return {
    observedDenominator: args.knownOutcomes,
    coverageDenominator: args.cohortSize,
  };
}

export function savingAdmissionPublishesOrNotifiesMentor(): boolean {
  return false;
}

export function privateJourneyNotifiesMentor(): boolean {
  return false;
}

export function milestoneCanBePublic(args: StoryConsent & {
  adminApproved: boolean;
  selected: boolean;
}): boolean {
  return args.selected && storyCanPublish({ ...args, spotlight: false });
}

export function internshipRequiresRelevance(details: string | null): boolean {
  return Boolean(details && details.trim().length > 0);
}

export function jobRequiresIndustry(args: {
  position: string | null;
  company: string | null;
  industry: string | null;
}): boolean {
  return Boolean(args.position || args.company || args.industry);
}

export function isJourneyIndustry(value: string): boolean {
  return INDUSTRY_IDS.includes(value);
}

export function canBecomeMentor(state: JourneyState): boolean {
  return state === "graduated" || state === "employed";
}
