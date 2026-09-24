export const EDUCATION_LEVELS = ["high_school", "diploma", "ug", "pg"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const INSTITUTION_LEVELS = ["school", "college", "university"] as const;
export type InstitutionLevel = (typeof INSTITUTION_LEVELS)[number];

export const BOARD_SYSTEMS = ["ib", "cbse", "igcse", "national", "other"] as const;
export type BoardSystem = (typeof BOARD_SYSTEMS)[number];

export const RESULT_STATUSES = [
  "available",
  "awaiting_result",
  "not_available",
] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const COMPLETION_STATUSES = [
  "completed",
  "currently_studying",
  "awaiting_result",
] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const SCORE_SCALES = ["gpa", "percentage", "letter", "other"] as const;
export type ScoreScale = (typeof SCORE_SCALES)[number];

export const MANUAL_REVIEW = "manual review";

export interface EducationRecordInput {
  institution: string;
  level: InstitutionLevel;
  country: string;
  city: string;
  board: BoardSystem;
  boardOther?: string;
  completionYear: number | null;
  completionStatus: CompletionStatus;
  resultStatus: ResultStatus;
  scoreValue: string;
  scoreScale: ScoreScale | "";
  scoreBounds?: string;
  evidenceId?: string | null;
}

export interface EducationSectionInput {
  level: EducationLevel | "";
  educationYears: number | null;
  records: EducationRecordInput[];
}

export interface FieldError {
  path: string;
  code: string;
  message: string;
}

function isIn<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function parseBoard(raw: string): { system: BoardSystem; other: string } {
  if (raw.startsWith("other:")) {
    return { system: "other", other: raw.slice("other:".length) };
  }
  if (isIn(raw, BOARD_SYSTEMS)) {
    return { system: raw, other: "" };
  }
  return { system: "other", other: raw };
}

export function serializeBoard(system: BoardSystem, other: string): string {
  if (system === "other") {
    return `other:${other.trim()}`;
  }
  return system;
}

export function parseScoreScale(raw: string): {
  scale: ScoreScale | "";
  bounds: string;
} {
  if (raw.startsWith("other:")) {
    return { scale: "other", bounds: raw.slice("other:".length) };
  }
  if (isIn(raw, SCORE_SCALES)) {
    return { scale: raw, bounds: "" };
  }
  if (raw === "awaiting_result" || raw === "not_available") {
    return { scale: "", bounds: "" };
  }
  return { scale: "", bounds: raw };
}

export function serializeScoreScale(scale: ScoreScale | "", bounds: string): string {
  if (scale === "other") {
    return `other:${bounds.trim()}`;
  }
  return scale;
}

export function validateEducationScore(input: {
  resultStatus: ResultStatus;
  scoreValue: string;
  scoreScale: ScoreScale | "";
  scoreBounds?: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (input.resultStatus !== "available") {
    if (input.scoreValue.trim() !== "") {
      errors.push({
        path: "scoreValue",
        code: "UNEXPECTED_SCORE",
        message: "Leave the score empty when the result is awaiting or not available.",
      });
    }
    return errors;
  }

  if (!input.scoreScale) {
    errors.push({
      path: "scoreScale",
      code: "SCALE_REQUIRED",
      message: "Available scores need their original scale.",
    });
    return errors;
  }

  const value = input.scoreValue.trim();
  if (!value) {
    errors.push({
      path: "scoreValue",
      code: "SCORE_REQUIRED",
      message: "Enter the original score. It is not converted.",
    });
    return errors;
  }

  if (input.scoreScale === "gpa") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 4) {
      errors.push({
        path: "scoreValue",
        code: "GPA_RANGE",
        message: "GPA on a 0–4 scale must stay between 0 and 4.",
      });
    }
  } else if (input.scoreScale === "percentage") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      errors.push({
        path: "scoreValue",
        code: "PERCENTAGE_RANGE",
        message: "A percentage must stay between 0 and 100.",
      });
    }
  } else if (input.scoreScale === "letter") {
    if (value.length < 1 || value.length > 10) {
      errors.push({
        path: "scoreValue",
        code: "LETTER_LENGTH",
        message: "A letter grade must be 1–10 characters.",
      });
    }
  } else if (input.scoreScale === "other") {
    if (!input.scoreBounds?.trim()) {
      errors.push({
        path: "scoreBounds",
        code: "BOUNDS_REQUIRED",
        message: "Other scales need named bounds. No generic conversion is applied.",
      });
    }
  }

  return errors;
}

export function compareEducationScores(
  left: { value: string; scale: string },
  right: { value: string; scale: string },
): "equal" | "left" | "right" | typeof MANUAL_REVIEW {
  if (left.scale !== right.scale) {
    return MANUAL_REVIEW;
  }
  const leftNumber = Number(left.value);
  const rightNumber = Number(right.value);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
    return left.value === right.value ? "equal" : MANUAL_REVIEW;
  }
  if (leftNumber === rightNumber) {
    return "equal";
  }
  return leftNumber > rightNumber ? "left" : "right";
}

export function validateEducationRecord(
  record: EducationRecordInput,
  index: number,
): FieldError[] {
  const prefix = `records.${index}`;
  const errors: FieldError[] = [];

  if (!record.institution.trim()) {
    errors.push({
      path: `${prefix}.institution`,
      code: "REQUIRED",
      message: "Enter the institution name.",
    });
  }
  if (!isIn(record.level, INSTITUTION_LEVELS)) {
    errors.push({
      path: `${prefix}.level`,
      code: "REQUIRED",
      message: "Choose school, college or university.",
    });
  }
  if (!/^[A-Za-z]{2}$/.test(record.country)) {
    errors.push({
      path: `${prefix}.country`,
      code: "COUNTRY",
      message: "Choose the institution country.",
    });
  }
  if (!record.city.trim()) {
    errors.push({
      path: `${prefix}.city`,
      code: "REQUIRED",
      message: "Enter the institution city.",
    });
  }
  if (!isIn(record.board, BOARD_SYSTEMS)) {
    errors.push({
      path: `${prefix}.board`,
      code: "REQUIRED",
      message: "Choose the board or exam system.",
    });
  }
  if (record.board === "other" && !record.boardOther?.trim()) {
    errors.push({
      path: `${prefix}.boardOther`,
      code: "OTHER_REQUIRED",
      message: "Name the other board or exam system.",
    });
  }
  if (!isIn(record.completionStatus, COMPLETION_STATUSES)) {
    errors.push({
      path: `${prefix}.completionStatus`,
      code: "REQUIRED",
      message: "Choose completed, currently studying or awaiting result.",
    });
  }
  if (
    record.completionStatus !== "currently_studying" &&
    (record.completionYear === null ||
      !Number.isInteger(record.completionYear) ||
      record.completionYear < 1950 ||
      record.completionYear > 2100)
  ) {
    errors.push({
      path: `${prefix}.completionYear`,
      code: "YEAR",
      message: "Enter the completion year. A future year is anticipated, not verified.",
    });
  }
  if (!isIn(record.resultStatus, RESULT_STATUSES)) {
    errors.push({
      path: `${prefix}.resultStatus`,
      code: "REQUIRED",
      message: "Say whether the score is available, awaiting or not available.",
    });
  }
  for (const error of validateEducationScore(record)) {
    errors.push({ ...error, path: `${prefix}.${error.path}` });
  }
  return errors;
}

export function validateEducationSection(
  input: EducationSectionInput,
): FieldError[] {
  const errors: FieldError[] = [];
  if (input.level && !isIn(input.level, EDUCATION_LEVELS)) {
    errors.push({
      path: "level",
      code: "INVALID",
      message: "Choose High School, Diploma, UG or PG.",
    });
  }
  if (
    input.educationYears !== null &&
    (!Number.isInteger(input.educationYears) ||
      input.educationYears < 0 ||
      input.educationYears > 40)
  ) {
    errors.push({
      path: "educationYears",
      code: "YEARS_RANGE",
      message: "Completed years must be an integer from 0 to 40.",
    });
  }
  input.records.forEach((record, index) => {
    errors.push(...validateEducationRecord(record, index));
  });
  return errors;
}
