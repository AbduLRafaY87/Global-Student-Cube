import { MANUAL_REVIEW, type FieldError } from "./education";

export const PROFILE_TEST_TYPES = [
  "IELTS",
  "TOEFL",
  "SAT",
  "GRE",
  "OTHER",
] as const;
export type ProfileTestType = (typeof PROFILE_TEST_TYPES)[number];

export const TOEFL_BAND_CUTOVER = "2026-01-21";
export const MANUAL_REVIEW_NEEDED = "Manual review needed";

export const TEST_SCALE_CODES = {
  IELTS_09: "IELTS_09",
  TOEFL_IBT_LEGACY_120: "TOEFL_IBT_LEGACY_120",
  TOEFL_IBT_BAND_2026: "TOEFL_IBT_BAND_2026",
  SAT_1600: "SAT_1600",
  GRE_V_Q_AW: "GRE_V_Q_AW",
  OTHER_REPORTED: "OTHER_REPORTED",
} as const;

export type TestScaleCode =
  (typeof TEST_SCALE_CODES)[keyof typeof TEST_SCALE_CODES];

export const TEST_VERIFICATIONS = [
  "unverified",
  "evidence_attached",
  "counselor_review",
  "verified",
] as const;
export type TestVerification = (typeof TEST_VERIFICATIONS)[number];

export interface TestSubscoreInput {
  name: string;
  score: number | null;
  reported: string;
}

export interface TestResultInput {
  testType: ProfileTestType;
  testVariant: string;
  scaleCode: string;
  scaleVersion: string;
  score: number | null;
  reportedScore: string;
  subscores: TestSubscoreInput[];
  comparableTotal: number | null;
  takenOn: string;
  evidenceId?: string | null;
  verification: TestVerification;
}

export interface TestRequirement {
  scaleCode: string;
  scaleVersion: string;
  minimum: number;
  concordanceRevision?: string | null;
}

function isIn<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

function halfStep(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9;
}

export function defaultToeflScale(takenOn: string): {
  scaleCode: typeof TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120 | typeof TEST_SCALE_CODES.TOEFL_IBT_BAND_2026;
  scaleVersion: string;
  testVariant: string;
} {
  if (takenOn >= TOEFL_BAND_CUTOVER) {
    return {
      scaleCode: TEST_SCALE_CODES.TOEFL_IBT_BAND_2026,
      scaleVersion: "2026.1",
      testVariant: "ibt_band_2026",
    };
  }
  return {
    scaleCode: TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120,
    scaleVersion: "legacy.1",
    testVariant: "ibt_legacy_120",
  };
}

export function isKnownTestScale(scaleCode: string): boolean {
  return Object.values(TEST_SCALE_CODES).includes(scaleCode as TestScaleCode);
}

export function validateTestResult(
  result: TestResultInput,
  index: number,
  today = new Date().toISOString().slice(0, 10),
): FieldError[] {
  const prefix = `tests.${index}`;
  const errors: FieldError[] = [];

  if (!isIn(result.testType, PROFILE_TEST_TYPES)) {
    errors.push({
      path: `${prefix}.testType`,
      code: "REQUIRED",
      message: "Choose a test type.",
    });
    return errors;
  }
  if (!result.testVariant.trim() || !result.scaleCode.trim() || !result.scaleVersion.trim()) {
    errors.push({
      path: `${prefix}.scaleCode`,
      code: "VERSIONED_SCALE",
      message: "Each result needs a test variant, scale code and scale version.",
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.takenOn)) {
    errors.push({
      path: `${prefix}.takenOn`,
      code: "DATE",
      message: "Enter the test date.",
    });
  } else if (result.takenOn > today) {
    errors.push({
      path: `${prefix}.takenOn`,
      code: "FUTURE",
      message: "A taken test cannot be in the future. Planned tests belong on the roadmap.",
    });
  }

  if (result.testType === "IELTS") {
    if (
      result.score === null ||
      result.score < 0 ||
      result.score > 9 ||
      !halfStep(result.score)
    ) {
      errors.push({
        path: `${prefix}.score`,
        code: "IELTS_RANGE",
        message: "IELTS overall is 0–9 in 0.5 increments.",
      });
    }
  } else if (
    result.testType === "TOEFL" &&
    result.scaleCode === TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120
  ) {
    if (
      result.score === null ||
      !Number.isInteger(result.score) ||
      result.score < 0 ||
      result.score > 120
    ) {
      errors.push({
        path: `${prefix}.score`,
        code: "TOEFL_LEGACY_RANGE",
        message: "Legacy TOEFL iBT totals are integers from 0 to 120.",
      });
    }
    if (
      result.comparableTotal !== null &&
      result.comparableTotal !== result.score
    ) {
      errors.push({
        path: `${prefix}.comparableTotal`,
        code: "NO_INFERRED_TOTAL",
        message: "Do not invent a comparable total for a legacy 0–120 report.",
      });
    }
  } else if (
    result.testType === "TOEFL" &&
    result.scaleCode === TEST_SCALE_CODES.TOEFL_IBT_BAND_2026
  ) {
    if (
      result.score === null ||
      result.score < 1 ||
      result.score > 6 ||
      !halfStep(result.score)
    ) {
      errors.push({
        path: `${prefix}.score`,
        code: "TOEFL_BAND_RANGE",
        message: "TOEFL iBT 2026 overall bands are 1–6 in half-point increments.",
      });
    }
    if (
      result.comparableTotal !== null &&
      (!Number.isInteger(result.comparableTotal) ||
        result.comparableTotal < 0 ||
        result.comparableTotal > 120)
    ) {
      errors.push({
        path: `${prefix}.comparableTotal`,
        code: "COMPARABLE_RANGE",
        message: "A report-provided comparable total must be an integer 0–120.",
      });
    }
    for (const subscore of result.subscores) {
      if (
        subscore.score !== null &&
        (subscore.score < 1 || subscore.score > 6 || !halfStep(subscore.score))
      ) {
        errors.push({
          path: `${prefix}.subscores`,
          code: "TOEFL_BAND_SECTION",
          message: "TOEFL iBT 2026 section bands are 1–6 in half-point increments.",
        });
      }
    }
  } else if (result.testType === "SAT") {
    if (
      result.score === null ||
      result.score < 400 ||
      result.score > 1600 ||
      result.score % 10 !== 0
    ) {
      errors.push({
        path: `${prefix}.score`,
        code: "SAT_RANGE",
        message: "SAT totals are 400–1600 in increments of 10.",
      });
    }
  } else if (result.testType === "GRE") {
    if (result.score !== null) {
      errors.push({
        path: `${prefix}.score`,
        code: "GRE_NO_TOTAL",
        message: "GRE has named components, never one ambiguous total.",
      });
    }
    const quantitative = result.subscores.find((row) => row.name === "quantitative");
    const verbal = result.subscores.find((row) => row.name === "verbal");
    const writing = result.subscores.find((row) => row.name === "analytical_writing");
    if (
      quantitative?.score === null ||
      quantitative === undefined ||
      !Number.isInteger(quantitative.score) ||
      quantitative.score < 130 ||
      quantitative.score > 170
    ) {
      errors.push({
        path: `${prefix}.subscores.quantitative`,
        code: "GRE_Q",
        message: "GRE Quantitative is an integer from 130 to 170.",
      });
    }
    if (
      verbal?.score === null ||
      verbal === undefined ||
      !Number.isInteger(verbal.score) ||
      verbal.score < 130 ||
      verbal.score > 170
    ) {
      errors.push({
        path: `${prefix}.subscores.verbal`,
        code: "GRE_V",
        message: "GRE Verbal is an integer from 130 to 170.",
      });
    }
    if (
      writing?.score === null ||
      writing === undefined ||
      writing.score < 0 ||
      writing.score > 6 ||
      !halfStep(writing.score)
    ) {
      errors.push({
        path: `${prefix}.subscores.analytical_writing`,
        code: "GRE_AW",
        message: "GRE Analytical Writing is 0–6 in 0.5 increments.",
      });
    }
  } else if (result.testType === "OTHER") {
    if (!result.reportedScore.trim() || !result.scaleCode.trim()) {
      errors.push({
        path: `${prefix}.reportedScore`,
        code: "HISTORICAL",
        message: "Other or historical variants keep the reported score and scale for counselor review.",
      });
    }
    if (result.verification === "verified") {
      errors.push({
        path: `${prefix}.verification`,
        code: "NEEDS_REVIEW",
        message: "Historical variants require counselor verification. No guessed conversion.",
      });
    }
  }

  return errors;
}

export function validateTestsSection(input: {
  testsTaken: boolean | null;
  tests: TestResultInput[];
}): FieldError[] {
  if (input.testsTaken === null) {
    return [
      {
        path: "testsTaken",
        code: "REQUIRED",
        message: "Say whether you have taken standardized tests.",
      },
    ];
  }
  if (!input.testsTaken) {
    return [];
  }
  if (input.tests.length === 0) {
    return [
      {
        path: "tests",
        code: "REQUIRED",
        message: "Add at least one test result, or choose No.",
      },
    ];
  }
  return input.tests.flatMap((result, index) => validateTestResult(result, index));
}

export type ScaleComparison = "met" | "unmet" | typeof MANUAL_REVIEW;

export function compareTestToRequirement(
  result: Pick<TestResultInput, "scaleCode" | "scaleVersion" | "score">,
  requirement: TestRequirement,
): ScaleComparison {
  if (
    result.scaleCode !== requirement.scaleCode ||
    result.scaleVersion !== requirement.scaleVersion
  ) {
    if (!requirement.concordanceRevision) {
      return MANUAL_REVIEW;
    }
    return MANUAL_REVIEW;
  }
  if (result.score === null) {
    return MANUAL_REVIEW;
  }
  return result.score >= requirement.minimum ? "met" : "unmet";
}

export function leftoverTestMapping(testType: string, score: number, testDate: string): {
  testType: ProfileTestType;
  testVariant: string;
  scaleCode: string;
  scaleVersion: string;
  score: number | null;
  reportedScore: string;
  subscores: TestSubscoreInput[];
  comparableTotal: number | null;
  verification: TestVerification;
} {
  const reported = String(score);
  if (testType === "IELTS") {
    return {
      testType: "IELTS",
      testVariant: "academic",
      scaleCode: TEST_SCALE_CODES.IELTS_09,
      scaleVersion: "1",
      score,
      reportedScore: reported,
      subscores: [],
      comparableTotal: null,
      verification: "unverified",
    };
  }
  if (testType === "TOEFL") {
    const defaults = defaultToeflScale(testDate);
    return {
      testType: "TOEFL",
      testVariant: defaults.testVariant,
      scaleCode: defaults.scaleCode,
      scaleVersion: defaults.scaleVersion,
      score,
      reportedScore: reported,
      subscores: [],
      comparableTotal: null,
      verification: "unverified",
    };
  }
  if (testType === "SAT") {
    return {
      testType: "SAT",
      testVariant: "sat",
      scaleCode: TEST_SCALE_CODES.SAT_1600,
      scaleVersion: "1",
      score,
      reportedScore: reported,
      subscores: [],
      comparableTotal: null,
      verification: "unverified",
    };
  }
  if (testType === "GRE") {
    return {
      testType: "GRE",
      testVariant: "general",
      scaleCode: TEST_SCALE_CODES.GRE_V_Q_AW,
      scaleVersion: "1",
      score: null,
      reportedScore: reported,
      subscores: [
        { name: "quantitative", score: null, reported },
        { name: "verbal", score: null, reported },
        { name: "analytical_writing", score: null, reported: "" },
      ],
      comparableTotal: null,
      verification: "counselor_review",
    };
  }
  return {
    testType: "OTHER",
    testVariant: testType.toLowerCase(),
    scaleCode: TEST_SCALE_CODES.OTHER_REPORTED,
    scaleVersion: "leftover.1",
    score: null,
    reportedScore: reported,
    subscores: [],
    comparableTotal: null,
    verification: "counselor_review",
  };
}
