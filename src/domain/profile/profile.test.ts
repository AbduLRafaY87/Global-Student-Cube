import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateModule2,
  firstIncompleteStep,
  type Module2Snapshot,
} from "./completion";
import {
  compareEducationScores,
  MANUAL_REVIEW,
  validateEducationScore,
  validateEducationSection,
  type EducationRecordInput,
} from "./education";
import {
  ACTIVITY_MAX,
  validateActivities,
  validateExperience,
} from "./experience";
import { validateFileUpload } from "./files";
import {
  requiredCountryCount,
  validateCareerGoal,
  validateCountryPreferences,
  validatePreferences,
  wordCount,
} from "./preferences";
import {
  compareTestToRequirement,
  defaultToeflScale,
  leftoverTestMapping,
  TEST_SCALE_CODES,
  TOEFL_BAND_CUTOVER,
  validateTestResult,
  validateTestsSection,
  type TestResultInput,
} from "./tests";

function schoolRecord(): EducationRecordInput {
  return {
    institution: "Synthetic High School",
    level: "school",
    country: "KE",
    city: "Nairobi",
    board: "national",
    completionYear: 2024,
    completionStatus: "completed",
    resultStatus: "available",
    scoreValue: "85",
    scoreScale: "percentage",
  };
}

function ieltsResult(): TestResultInput {
  return {
    testType: "IELTS",
    testVariant: "academic",
    scaleCode: TEST_SCALE_CODES.IELTS_09,
    scaleVersion: "1",
    score: 7.5,
    reportedScore: "7.5",
    subscores: [],
    comparableTotal: null,
    takenOn: "2025-06-01",
    verification: "unverified",
  };
}

function completeSnapshot(overrides: Partial<Module2Snapshot> = {}): Module2Snapshot {
  return {
    education: {
      level: "high_school",
      educationYears: 12,
      records: [schoolRecord()],
    },
    testsTaken: false,
    tests: [],
    preferences: {
      continuingField: null,
      targetLevel: "undergraduate",
      fieldIds: ["field-undecided"],
      previousFieldIds: [],
      disciplineIds: [],
      specializationIds: [],
      countries: [
        { countryCode: "GB", priority: 1, cities: [] },
        { countryCode: "CA", priority: 2, cities: [] },
        { countryCode: "DE", priority: 3, cities: [] },
      ],
      intakeMonth: 9,
      intakeYear: 2027,
      intakeUndecided: false,
      accommodation: "dorm",
    },
    experience: {
      careerGoal: "I am unsure about a major and want guided exploration.",
      activities: [],
      scholarshipReceived: false,
      scholarshipNotGranted: false,
      awards: [],
      relative: { hasRelative: false, relationship: "", country: "", city: "" },
    },
    supportedCountryCount: 12,
    undecidedDisciplineId: "discipline-undecided",
    ...overrides,
  };
}

describe("education scales", () => {
  it("keeps a percentage on its original scale and never converts it to GPA", () => {
    assert.deepEqual(
      validateEducationScore({
        resultStatus: "available",
        scoreValue: "87",
        scoreScale: "percentage",
      }),
      [],
    );
    assert.equal(
      compareEducationScores(
        { value: "87", scale: "percentage" },
        { value: "3.6", scale: "gpa" },
      ),
      MANUAL_REVIEW,
    );
  });

  it("requires named bounds for an other institution scale", () => {
    const errors = validateEducationScore({
      resultStatus: "available",
      scoreValue: "12",
      scoreScale: "other",
    });
    assert.equal(errors[0]?.code, "BOUNDS_REQUIRED");
  });

  it("allows awaiting or unavailable results without a score", () => {
    assert.deepEqual(
      validateEducationScore({
        resultStatus: "awaiting_result",
        scoreValue: "",
        scoreScale: "",
      }),
      [],
    );
  });

  it("rejects completed years outside 0–40", () => {
    const errors = validateEducationSection({
      level: "ug",
      educationYears: 41,
      records: [schoolRecord()],
    });
    assert.ok(errors.some((error) => error.code === "YEARS_RANGE"));
  });
});

describe("versioned tests", () => {
  it("treats legacy TOEFL 0–120 and the 2026 band scale as unlike", () => {
    const legacy = compareTestToRequirement(
      {
        scaleCode: TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120,
        scaleVersion: "legacy.1",
        score: 100,
      },
      {
        scaleCode: TEST_SCALE_CODES.TOEFL_IBT_BAND_2026,
        scaleVersion: "2026.1",
        minimum: 5,
      },
    );
    assert.equal(legacy, MANUAL_REVIEW);

    const band = validateTestResult(
      {
        testType: "TOEFL",
        testVariant: "ibt_band_2026",
        scaleCode: TEST_SCALE_CODES.TOEFL_IBT_BAND_2026,
        scaleVersion: "2026.1",
        score: 5.5,
        reportedScore: "5.5",
        subscores: [{ name: "reading", score: 5, reported: "5" }],
        comparableTotal: 102,
        takenOn: "2026-03-01",
        verification: "unverified",
      },
      0,
      "2026-09-24",
    );
    assert.deepEqual(band, []);
  });

  it("defaults TOEFL schema from the 21 January 2026 cutover without converting", () => {
    assert.equal(
      defaultToeflScale("2026-01-20").scaleCode,
      TEST_SCALE_CODES.TOEFL_IBT_LEGACY_120,
    );
    assert.equal(
      defaultToeflScale(TOEFL_BAND_CUTOVER).scaleCode,
      TEST_SCALE_CODES.TOEFL_IBT_BAND_2026,
    );
  });

  it("rejects a GRE total and future taken dates", () => {
    const gre = validateTestResult(
      {
        testType: "GRE",
        testVariant: "general",
        scaleCode: TEST_SCALE_CODES.GRE_V_Q_AW,
        scaleVersion: "1",
        score: 320,
        reportedScore: "320",
        subscores: [
          { name: "quantitative", score: 160, reported: "160" },
          { name: "verbal", score: 155, reported: "155" },
          { name: "analytical_writing", score: 4.5, reported: "4.5" },
        ],
        comparableTotal: null,
        takenOn: "2025-01-01",
        verification: "unverified",
      },
      0,
    );
    assert.ok(gre.some((error) => error.code === "GRE_NO_TOTAL"));

    const future = validateTestResult(
      { ...ieltsResult(), takenOn: "2099-01-01" },
      0,
      "2026-09-24",
    );
    assert.ok(future.some((error) => error.code === "FUTURE"));
  });

  it("lets No complete without tests and maps leftover unlike scales to review", () => {
    assert.deepEqual(validateTestsSection({ testsTaken: false, tests: [] }), []);
    const leftover = leftoverTestMapping("ACT", 28, "2024-01-01");
    assert.equal(leftover.testType, "OTHER");
    assert.equal(leftover.verification, "counselor_review");
    assert.equal(
      compareTestToRequirement(
        leftover,
        {
          scaleCode: TEST_SCALE_CODES.SAT_1600,
          scaleVersion: "1",
          minimum: 1200,
        },
      ),
      MANUAL_REVIEW,
    );
  });
});

describe("preferences and goals", () => {
  it("requires exactly three distinct countries when the catalog supports three or more", () => {
    assert.equal(requiredCountryCount(12), 3);
    const duplicate = validateCountryPreferences(
      [
        { countryCode: "GB", priority: 1, cities: [] },
        { countryCode: "GB", priority: 2, cities: [] },
        { countryCode: "CA", priority: 3, cities: [] },
      ],
      12,
    );
    assert.ok(duplicate.some((error) => error.code === "DUPLICATE"));

    const four = validateCountryPreferences(
      [
        { countryCode: "GB", priority: 1, cities: [] },
        { countryCode: "CA", priority: 2, cities: [] },
        { countryCode: "DE", priority: 3, cities: [] },
        { countryCode: "NL", priority: 4, cities: [] },
      ],
      12,
    );
    assert.ok(four.some((error) => error.code === "COUNT"));
  });

  it("allows the available count when the catalog supports fewer than three countries", () => {
    assert.equal(requiredCountryCount(2), 2);
    assert.deepEqual(
      validateCountryPreferences(
        [
          { countryCode: "GB", priority: 1, cities: [] },
          { countryCode: "CA", priority: 2, cities: [] },
        ],
        2,
      ),
      [],
    );
  });

  it("rejects a 201-word career goal and Masters without a discipline", () => {
    const words = Array.from({ length: 201 }, () => "word").join(" ");
    assert.equal(wordCount(words), 201);
    assert.equal(validateCareerGoal(words)[0]?.code, "WORD_LIMIT");

    const masters = validatePreferences(
      {
        continuingField: null,
        targetLevel: "masters",
        fieldIds: ["field-stem"],
        previousFieldIds: [],
        disciplineIds: [],
        specializationIds: [],
        countries: [
          { countryCode: "GB", priority: 1, cities: [] },
          { countryCode: "CA", priority: 2, cities: [] },
          { countryCode: "DE", priority: 3, cities: [] },
        ],
        intakeMonth: 9,
        intakeYear: 2027,
        intakeUndecided: false,
        accommodation: "shared",
      },
      12,
      "discipline-undecided",
    );
    assert.ok(masters.some((error) => error.code === "MASTERS_DISCIPLINE"));
  });
});

describe("activities and files", () => {
  it("rejects a sixth activity without dropping the accepted five", () => {
    const five = Array.from({ length: ACTIVITY_MAX }, (_, index) => ({
      ordinal: index + 1,
      type: "sport" as const,
      otherType: "",
      name: `Activity ${index + 1}`,
      role: "",
      durationMonths: 6,
      durationText: "",
      hoursWeek: 4,
      achievements: "",
    }));
    assert.deepEqual(validateActivities(five), []);
    const sixth = validateActivities([
      ...five,
      {
        ordinal: 6,
        type: "arts",
        otherType: "",
        name: "Overflow",
        role: "",
        durationMonths: 1,
        durationText: "",
        hoursWeek: 1,
        achievements: "",
      },
    ]);
    assert.ok(sixth.some((error) => error.code === "LIMIT"));
    assert.equal(five.length, 5);
  });

  it("lets a user finish without activities or a video", () => {
    const errors = validateExperience({
      careerGoal: "Unsure about a major.",
      activities: [],
      scholarshipReceived: false,
      scholarshipNotGranted: false,
      awards: [],
      relative: { hasRelative: false, relationship: "", country: "", city: "" },
    });
    assert.deepEqual(errors, []);
  });

  it("rejects an overlong introduction and HTML uploads", () => {
    const video = validateFileUpload({
      purpose: "introduction_media",
      sizeBytes: 1000,
      mime: "video/mp4",
      durationSeconds: 61,
    });
    assert.ok(video.some((error) => error.code === "DURATION"));
    const html = validateFileUpload({
      purpose: "transcript",
      sizeBytes: 1000,
      mime: "text/html",
    });
    assert.ok(html.some((error) => error.code === "REJECTED_TYPE"));
  });
});

describe("module 2 completion gating", () => {
  it("completes when required education, preferences and explicit No tests are valid", () => {
    const report = evaluateModule2(completeSnapshot());
    assert.equal(report.complete, true);
    assert.deepEqual(report.missing, []);
    assert.equal(report.firstIncompleteStep, "review");
  });

  it("keeps personalization locked until required fields are present", () => {
    const incomplete = evaluateModule2(
      completeSnapshot({
        education: { level: "", educationYears: null, records: [] },
      }),
    );
    assert.equal(incomplete.complete, false);
    assert.equal(incomplete.firstIncompleteStep, "education");
    assert.equal(evaluateModule2(completeSnapshot({ testsTaken: null })).firstIncompleteStep, "tests");
    assert.equal(
      firstIncompleteStep(completeSnapshot({ testsTaken: null })),
      "tests",
    );
  });
});
