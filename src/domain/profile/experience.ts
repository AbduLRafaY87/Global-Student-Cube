import type { FieldError } from "./education";
import { wordCount } from "./preferences";

export const ACTIVITY_TYPES = [
  "sport",
  "academic",
  "volunteer",
  "arts",
  "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_MAX = 5;
export const ACTIVITY_NAME_MAX = 160;
export const ACTIVITY_ROLE_MAX = 160;
export const ACTIVITY_DURATION_TEXT_MAX = 80;
export const ACTIVITY_ACHIEVEMENTS_MAX = 600;
export const AWARD_MAX_EACH = 20;

export const AWARD_OUTCOMES = ["received", "not_granted"] as const;
export type AwardOutcome = (typeof AWARD_OUTCOMES)[number];

export interface ActivityInput {
  ordinal: number;
  type: ActivityType | "";
  otherType: string;
  name: string;
  role: string;
  durationMonths: number | null;
  durationText: string;
  hoursWeek: number | null;
  achievements: string;
}

export interface AwardInput {
  name: string;
  outcome: AwardOutcome;
  year: number | null;
  amount: number | null;
  currency: string | null;
  evidenceId?: string | null;
  evidenceUnavailableReason: string;
}

export interface RelativeInput {
  hasRelative: boolean;
  relationship: string;
  country: string;
  city: string;
}

export interface ExperienceInput {
  careerGoal: string;
  activities: ActivityInput[];
  scholarshipReceived: boolean | null;
  scholarshipNotGranted: boolean | null;
  awards: AwardInput[];
  relative: RelativeInput | null;
  introFileId?: string | null;
}

function isIn<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function validateActivities(activities: ActivityInput[]): FieldError[] {
  const errors: FieldError[] = [];
  if (activities.length > ACTIVITY_MAX) {
    errors.push({
      path: "activities",
      code: "LIMIT",
      message: "At most five activities can be saved. Extra entries were not added.",
    });
  }

  const seen = new Set<number>();
  activities.slice(0, ACTIVITY_MAX).forEach((activity, index) => {
    const prefix = `activities.${index}`;
    if (activity.ordinal !== index + 1 || seen.has(activity.ordinal)) {
      errors.push({
        path: `${prefix}.ordinal`,
        code: "ORDINAL",
        message: "Activities use order 1 to 5.",
      });
    }
    seen.add(activity.ordinal);
    if (!activity.type || !isIn(activity.type, ACTIVITY_TYPES)) {
      errors.push({
        path: `${prefix}.type`,
        code: "REQUIRED",
        message: "Each activity needs a type.",
      });
    }
    if (activity.type === "other" && !activity.otherType.trim()) {
      errors.push({
        path: `${prefix}.otherType`,
        code: "OTHER_REQUIRED",
        message: "Describe the other activity type.",
      });
    }
    if (!activity.name.trim() || activity.name.trim().length > ACTIVITY_NAME_MAX) {
      errors.push({
        path: `${prefix}.name`,
        code: "NAME",
        message: "Each activity needs a name of at most 160 characters.",
      });
    }
    if (activity.role.length > ACTIVITY_ROLE_MAX) {
      errors.push({
        path: `${prefix}.role`,
        code: "ROLE",
        message: "Role can be at most 160 characters.",
      });
    }
    if (activity.durationText.length > ACTIVITY_DURATION_TEXT_MAX) {
      errors.push({
        path: `${prefix}.durationText`,
        code: "DURATION_TEXT",
        message: "Duration text can be at most 80 characters.",
      });
    }
    if (
      activity.hoursWeek !== null &&
      (activity.hoursWeek < 0 || activity.hoursWeek > 168)
    ) {
      errors.push({
        path: `${prefix}.hoursWeek`,
        code: "HOURS",
        message: "Hours per week must be between 0 and 168.",
      });
    }
    if (activity.achievements.length > ACTIVITY_ACHIEVEMENTS_MAX) {
      errors.push({
        path: `${prefix}.achievements`,
        code: "ACHIEVEMENTS",
        message: "Achievements can be at most 600 characters.",
      });
    }
    if (
      activity.durationMonths !== null &&
      (!Number.isInteger(activity.durationMonths) || activity.durationMonths < 0)
    ) {
      errors.push({
        path: `${prefix}.durationMonths`,
        code: "DURATION",
        message: "Duration in months must be zero or a positive integer.",
      });
    }
  });

  return errors;
}

export function validateAwards(
  received: boolean | null,
  notGranted: boolean | null,
  awards: AwardInput[],
): FieldError[] {
  const errors: FieldError[] = [];
  if (received === null || notGranted === null) {
    errors.push({
      path: "scholarshipReceived",
      code: "REQUIRED",
      message: "Say whether you received a scholarship and whether one was applied and not granted.",
    });
    return errors;
  }

  const receivedRows = awards.filter((row) => row.outcome === "received");
  const notGrantedRows = awards.filter((row) => row.outcome === "not_granted");

  if (received && receivedRows.length === 0) {
    errors.push({
      path: "awards",
      code: "RECEIVED_REQUIRED",
      message: "A Yes on received scholarships needs at least one history record.",
    });
  }
  if (notGranted && notGrantedRows.length === 0) {
    errors.push({
      path: "awards",
      code: "NOT_GRANTED_REQUIRED",
      message: "A Yes on applied-not-granted needs at least one history record.",
    });
  }
  if (receivedRows.length > AWARD_MAX_EACH || notGrantedRows.length > AWARD_MAX_EACH) {
    errors.push({
      path: "awards",
      code: "LIMIT",
      message: "At most 20 records of each scholarship outcome can be stored.",
    });
  }

  awards.forEach((award, index) => {
    const prefix = `awards.${index}`;
    if (!award.name.trim()) {
      errors.push({
        path: `${prefix}.name`,
        code: "REQUIRED",
        message: "Enter the scholarship name.",
      });
    }
    if (
      award.year === null ||
      !Number.isInteger(award.year) ||
      award.year < 1950 ||
      award.year > 2100
    ) {
      errors.push({
        path: `${prefix}.year`,
        code: "YEAR",
        message: "Enter the decision year.",
      });
    }
    if (award.amount !== null && award.amount < 0) {
      errors.push({
        path: `${prefix}.amount`,
        code: "AMOUNT",
        message: "Amount cannot be negative.",
      });
    }
    if ((award.amount !== null) !== Boolean(award.currency)) {
      errors.push({
        path: `${prefix}.currency`,
        code: "PAIRED",
        message: "Amount and currency must be stored together.",
      });
    }
    if (award.currency && !/^[A-Za-z]{3}$/.test(award.currency)) {
      errors.push({
        path: `${prefix}.currency`,
        code: "CURRENCY",
        message: "Use a three-letter currency code.",
      });
    }
    if (!award.evidenceId && !award.evidenceUnavailableReason.trim()) {
      errors.push({
        path: `${prefix}.evidence`,
        code: "EVIDENCE",
        message: "Attach a decision letter or record why evidence is unavailable.",
      });
    }
  });

  return errors;
}

export function validateRelative(relative: RelativeInput | null): FieldError[] {
  if (!relative || !relative.hasRelative) {
    return [];
  }
  const errors: FieldError[] = [];
  if (!relative.relationship.trim()) {
    errors.push({
      path: "relative.relationship",
      code: "REQUIRED",
      message: "A relative abroad needs a relationship, not a name or contact.",
    });
  }
  if (!/^[A-Za-z]{2}$/.test(relative.country) || !relative.city.trim()) {
    errors.push({
      path: "relative.country",
      code: "LOCATION",
      message: "Enter the relative’s city and country. No contact details are collected.",
    });
  }
  return errors;
}

export function validateExperience(input: ExperienceInput): FieldError[] {
  const errors: FieldError[] = [];
  const count = wordCount(input.careerGoal);
  if (!input.careerGoal.trim()) {
    errors.push({
      path: "careerGoal",
      code: "REQUIRED",
      message: "Describe your career goal or say you are unsure.",
    });
  } else if (count > 200) {
    errors.push({
      path: "careerGoal",
      code: "WORD_LIMIT",
      message: "Career goals can be at most 200 words.",
    });
  }
  errors.push(...validateActivities(input.activities));
  errors.push(
    ...validateAwards(
      input.scholarshipReceived,
      input.scholarshipNotGranted,
      input.awards,
    ),
  );
  errors.push(...validateRelative(input.relative));
  return errors;
}
