import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RECOMMENDATION_CAP,
  buildRecommendationSet,
  guestMatchLimit,
  isAcademicProfileComplete,
  orderCostBandDisplay,
  type RecommendationCandidate,
  type RecommendationPreferences,
} from "./recommendations";

const FIELD = "field-masters";
const SUBJECT = "Computer Science";

function candidate(
  letter: string,
  overrides: Partial<RecommendationCandidate> = {},
): RecommendationCandidate {
  const universityId = `${letter.repeat(8)}-${letter.repeat(4)}-4${letter.repeat(3)}-8${letter.repeat(3)}-${letter.repeat(12)}`;
  return {
    universityId,
    programId: `${letter}-program`,
    city: "Other",
    country: "US",
    level: "masters",
    fieldId: FIELD,
    disciplineIds: [],
    specializationIds: [],
    annualComparisonCost: null,
    cityLivingCost: null,
    rank: {
      publisher: "qs",
      editionYear: 2026,
      subject: SUBJECT,
      rankMin: 99,
      rankMax: null,
    },
    ...overrides,
  };
}

const A = candidate("a", { city: "London", country: "GB", rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 40, rankMax: null } });
const B = candidate("b", { city: "London", country: "GB", rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 41, rankMax: null } });
const C = candidate("c", { city: "Manchester", country: "GB", rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 42, rankMax: null } });
const D = candidate("d", { annualComparisonCost: 10000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 90, rankMax: null } });
const E = candidate("e", { annualComparisonCost: 10500, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 50, rankMax: null } });
const F = candidate("f", { annualComparisonCost: 11000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 70, rankMax: null } });
const G = candidate("g", { annualComparisonCost: 12000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 60, rankMax: null } });
const H = candidate("h", { annualComparisonCost: 20000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 10, rankMax: null } });
const I = candidate("i", { annualComparisonCost: 21000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 20, rankMax: null } });
const J = candidate("j", { annualComparisonCost: 22000, rank: { publisher: "qs", editionYear: 2026, subject: SUBJECT, rankMin: 30, rankMax: null } });

const PREFS: RecommendationPreferences = {
  level: "masters",
  fieldId: FIELD,
  disciplineId: null,
  specializationId: null,
  preferredCountries: ["GB", "US"],
  preferredCities: ["London"],
  requestedSubject: SUBJECT,
};

const SYNTHETIC = [A, B, C, D, E, F, G, H, I, J];

describe("spec SYNTHETIC recommendation example", () => {
  it("builds A, B, C, then band-displayed costs E/F/D/G, then ranks H/I/J", () => {
    const result = buildRecommendationSet({
      candidates: SYNTHETIC,
      preferences: PREFS,
      manualUniversityIds: [A.universityId],
    });

    assert.deepEqual(
      result.slots.map((slot) => slot.universityId),
      [A, B, C, E, F, D, G, H, I, J].map((item) => item.universityId),
    );
    assert.deepEqual(
      result.slots.map((slot) => slot.reason),
      [
        "manual",
        "city",
        "country",
        "lowest_cost",
        "lowest_cost",
        "lowest_cost",
        "lowest_cost",
        "strongest_rank",
        "strongest_rank",
        "strongest_rank",
      ],
    );
    assert.equal(result.slots.length <= RECOMMENDATION_CAP, true);
    assert.equal(result.rankingContext?.publisher, "qs");
    assert.equal(result.emptyReason, null);
  });

  it("orders the four cost picks with a 110% band before the next band", () => {
    const ordered = orderCostBandDisplay([D, E, F, G], PREFS, {
      publisher: "qs",
      editionYear: 2026,
      subject: SUBJECT,
    });
    assert.deepEqual(
      ordered.map((item) => item.universityId),
      [E, F, D, G].map((item) => item.universityId),
    );
  });
});

describe("recommendation edges", () => {
  it("caps five manual picks plus remaining stages at 10 and dedupes manuals", () => {
    const extras = ["k", "l", "m", "n"].map((letter) =>
      candidate(letter, { country: "US", annualComparisonCost: 30000 + letter.charCodeAt(0) }),
    );
    const manuals = [A, B, C, D, E];
    const result = buildRecommendationSet({
      candidates: [...SYNTHETIC, ...extras],
      preferences: PREFS,
      manualUniversityIds: [
        A.universityId,
        A.universityId,
        B.universityId,
        C.universityId,
        D.universityId,
        E.universityId,
      ],
    });

    assert.equal(result.slots.length, 10);
    assert.deepEqual(
      result.slots.slice(0, 5).map((slot) => slot.universityId),
      manuals.map((item) => item.universityId),
    );
    assert.equal(new Set(result.slots.map((slot) => slot.universityId)).size, 10);
  });

  it("sorts unknown costs after known costs and never treats them as zero", () => {
    const unknown = candidate("u", {
      country: "US",
      annualComparisonCost: null,
      rank: null,
    });
    const cheap = candidate("v", { country: "US", annualComparisonCost: 1 });
    const result = buildRecommendationSet({
      candidates: [unknown, cheap],
      preferences: { ...PREFS, preferredCountries: ["US"], preferredCities: [] },
      manualUniversityIds: [],
    });

    assert.equal(result.slots[0]?.universityId, cheap.universityId);
    assert.equal(result.slots[1]?.universityId, unknown.universityId);
    assert.equal(result.slots[1]?.reason, "fill");
  });

  it("returns an honest empty set for an empty catalog", () => {
    const result = buildRecommendationSet({
      candidates: [],
      preferences: PREFS,
      manualUniversityIds: [A.universityId],
    });
    assert.deepEqual(result.slots, []);
    assert.ok(result.emptyReason);
  });

  it("does not silently relax a mismatched level", () => {
    const undergrad = candidate("z", { level: "undergraduate", country: "GB" });
    const result = buildRecommendationSet({
      candidates: [undergrad],
      preferences: PREFS,
      manualUniversityIds: [],
    });
    assert.equal(result.slots.length, 0);
    assert.ok(result.emptyReason?.includes("not relaxed"));
  });

  it("labels a manual pick outside preferred countries", () => {
    const outside = candidate("o", { country: "PK", city: "Lahore" });
    const result = buildRecommendationSet({
      candidates: [outside, A],
      preferences: PREFS,
      manualUniversityIds: [outside.universityId],
    });
    assert.equal(result.slots[0]?.reason, "manual_outside_preferred_countries");
  });

  it("requires a complete academic profile before personalizing", () => {
    assert.equal(isAcademicProfileComplete(PREFS, 12), false);
    assert.equal(
      isAcademicProfileComplete({ ...PREFS, preferredCountries: ["GB", "US", "CA"] }, 12),
      true,
    );
    assert.equal(
      isAcademicProfileComplete({ ...PREFS, preferredCountries: ["GB"] }, 1),
      true,
    );
    assert.equal(guestMatchLimit(12, 9).universities, 5);
    assert.equal(guestMatchLimit(2, 1).scholarships, 1);
  });
});
