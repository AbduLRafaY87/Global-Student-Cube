import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIKELY_THRESHOLD,
  POSSIBLE_THRESHOLD,
  SELF_REPORTED_DISCLAIMER,
  comparePublishedRequirement,
  evaluateAssessment,
  publishedThresholdLabel,
  type AssessmentClaim,
  type AssessmentCriterionInput,
} from "./assessment";

function criterion(
  key: string,
  weight: number | null,
  extras: Partial<AssessmentCriterionInput> = {},
): AssessmentCriterionInput {
  return {
    key,
    kind: extras.kind ?? "academic",
    weight,
    mandatory: extras.mandatory ?? true,
    hard: extras.hard,
    applicable: extras.applicable,
    requirement: extras.requirement ?? { minimum: "Not provided" },
  };
}

function claim(
  key: string,
  answer: AssessmentClaim["answer"],
  explanation = "SYNTHETIC evidence note",
): AssessmentClaim {
  return { key, answer, evidenceFileId: null, explanation };
}

const SYNTHETIC: AssessmentCriterionInput[] = [
  criterion("gpa", 20),
  criterion("standardized_test", 15, {
    kind: "test",
    hard: true,
    requirement: {
      scaleCode: "TOEFL_IBT_LEGACY_120",
      scaleVersion: "legacy.1",
      minimum: 90,
      hard: true,
    },
  }),
  criterion("prerequisites", 15),
  criterion("documents", 10),
  criterion("language", 20),
  criterion("deadline", 20),
];

function allButTestMeet(): AssessmentClaim[] {
  return [
    claim("gpa", "meets"),
    claim("standardized_test", "unknown", ""),
    claim("prerequisites", "meets"),
    claim("documents", "meets"),
    claim("language", "meets"),
    claim("deadline", "meets"),
  ];
}

describe("program self-assessment", () => {
  it("uses the published disclaimer and never treats the score as an admission probability", () => {
    const result = evaluateAssessment(SYNTHETIC, allButTestMeet());
    assert.equal(result.disclaimer, SELF_REPORTED_DISCLAIMER);
    assert.equal(result.disclaimer.includes("admission probability"), true);
    assert.equal(LIKELY_THRESHOLD, 85);
    assert.equal(POSSIBLE_THRESHOLD, 60);
  });

  it("scores the SYNTHETIC weights at 85 when every applicable criterion except the test meets", () => {
    const result = evaluateAssessment(SYNTHETIC, allButTestMeet());
    assert.equal(result.score, 85);
    assert.equal(result.knownCoverage, 85);
    assert.equal(result.possibleLow, 85);
    assert.equal(result.possibleHigh, 100);
    assert.equal(result.label, "provisional");
    assert.equal(result.unknownMandatory, true);
  });

  it("overrides Likely eligible when a hard criterion is unmet, even at 85", () => {
    const claims = allButTestMeet();
    claims[1] = claim("standardized_test", "does_not_meet");
    const result = evaluateAssessment(SYNTHETIC, claims);
    assert.equal(result.score, 85);
    assert.equal(result.hardUnmet, true);
    assert.equal(result.label, "requirements_not_met");
  });

  it("keeps Likely eligible for a verified non-hard unmet criterion at 85", () => {
    const criteria = SYNTHETIC.map((row) =>
      row.key === "standardized_test"
        ? { ...row, mandatory: false, hard: false, requirement: { minimum: "optional" } }
        : row,
    );
    const claims = allButTestMeet();
    claims[1] = claim("standardized_test", "does_not_meet");
    const result = evaluateAssessment(criteria, claims);
    assert.equal(result.score, 85);
    assert.equal(result.label, "likely_eligible");
  });

  it("applies 85 and 60 only on complete configured data", () => {
    const completeMeet = SYNTHETIC.map((row) => claim(row.key, "meets"));
    const likely = evaluateAssessment(SYNTHETIC, completeMeet, [
      {
        kind: "test",
        scaleCode: "TOEFL_IBT_LEGACY_120",
        scaleVersion: "legacy.1",
        score: 100,
        verified: true,
      },
    ]);
    assert.equal(likely.score, 100);
    assert.equal(likely.label, "likely_eligible");

    const atSixty: AssessmentCriterionInput[] = [
      criterion("a", 60),
      criterion("b", 40, { mandatory: false, hard: false }),
    ];
    const possibly = evaluateAssessment(atSixty, [
      claim("a", "meets"),
      claim("b", "does_not_meet"),
    ]);
    assert.equal(possibly.score, 60);
    assert.equal(possibly.label, "possibly_eligible");

    const below = evaluateAssessment(atSixty, [
      claim("a", "does_not_meet"),
      claim("b", "meets"),
    ]);
    assert.equal(below.score, 40);
    assert.equal(below.label, "requirements_not_met");
  });

  it("treats 85 as Likely eligible and just below 85 as Possibly eligible", () => {
    const criteria = [criterion("a", 85), criterion("b", 15, { mandatory: false, hard: false })];
    const atThreshold = evaluateAssessment(criteria, [
      claim("a", "meets"),
      claim("b", "does_not_meet"),
    ]);
    assert.equal(atThreshold.score, 85);
    assert.equal(atThreshold.label, "likely_eligible");

    const justBelow = evaluateAssessment(
      [criterion("a", 84), criterion("b", 16, { mandatory: false, hard: false })],
      [claim("a", "meets"), claim("b", "does_not_meet")],
    );
    assert.equal(justBelow.score, 84);
    assert.equal(justBelow.label, "possibly_eligible");
  });

  it("returns Unknown when no applicable requirements remain", () => {
    const result = evaluateAssessment(
      [criterion("excluded", 20, { applicable: false, requirement: { applicable: false } })],
      [claim("excluded", "meets")],
    );
    assert.equal(result.score, null);
    assert.equal(result.label, "unknown");
  });

  it("uses equal weights and discloses that rule when published weights are missing", () => {
    const result = evaluateAssessment(
      [criterion("one", null), criterion("two", null)],
      [claim("one", "meets"), claim("two", "does_not_meet")],
    );
    assert.equal(result.equalWeights, true);
    assert.equal(result.score, 50);
    assert.equal(result.label, "requirements_not_met");
  });

  it("does not let a Meets tick bypass verification or unlike test scales", () => {
    const unlike = comparePublishedRequirement(
      {
        scaleCode: "TOEFL_IBT_BAND_2026",
        scaleVersion: "2026.1",
        minimum: 5,
      },
      {
        kind: "test",
        scaleCode: "TOEFL_IBT_LEGACY_120",
        scaleVersion: "legacy.1",
        score: 110,
        verified: true,
      },
    );
    assert.equal(unlike, "unlike_scale");

    const result = evaluateAssessment(
      [
        criterion("standardized_test", 100, {
          kind: "test",
          requirement: {
            scaleCode: "TOEFL_IBT_BAND_2026",
            scaleVersion: "2026.1",
            minimum: 5,
          },
        }),
      ],
      [claim("standardized_test", "meets")],
      [
        {
          kind: "test",
          scaleCode: "TOEFL_IBT_LEGACY_120",
          scaleVersion: "legacy.1",
          score: 110,
          verified: true,
        },
      ],
    );
    assert.equal(result.items[0]?.effectiveAnswer, "unknown");
    assert.equal(result.items[0]?.verification, "unlike_scale");
    assert.equal(result.label, "provisional");
  });

  it("treats a Meets claim without evidence as Unknown", () => {
    const result = evaluateAssessment(
      [criterion("documents", 100)],
      [{ key: "documents", answer: "meets", evidenceFileId: null, explanation: "" }],
    );
    assert.equal(result.items[0]?.effectiveAnswer, "unknown");
    assert.equal(result.items[0]?.verification, "missing_evidence");
    assert.equal(result.label, "provisional");
  });

  it("ignores a Not applicable tick when the published rule still applies", () => {
    const result = evaluateAssessment(
      [criterion("documents", 100)],
      [claim("documents", "not_applicable")],
    );
    assert.equal(result.items[0]?.effectiveAnswer, "unknown");
    assert.equal(result.label, "provisional");
  });

  it("renders a published threshold without inventing a missing value", () => {
    assert.equal(
      publishedThresholdLabel({
        scaleCode: "TOEFL_IBT_LEGACY_120",
        scaleVersion: "legacy.1",
        minimum: 90,
      }),
      "Minimum 90 · TOEFL_IBT_LEGACY_120 legacy.1",
    );
    assert.equal(publishedThresholdLabel({}), "Not provided");
  });
});
