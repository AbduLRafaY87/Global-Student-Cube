import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canUnlockVisaGuidance,
  claimsVisaApprovalOrGuarantee,
  counselorNotesAreOfficial,
  guidanceLockReason,
  leftoverDocumentKey,
  leftoverHousingType,
  mapDirectionsHref,
  matchCountryGuidance,
  mealIncludedPreventsDoubleCount,
  quarterlyReminderNeeded,
  quarterlyReviewDue,
  sourceTrace,
} from "./guidance";
import { importsNeverAutoPublish } from "./ingestion";

describe("visa guidance gating", () => {
  it("stays locked before counseling or target selection and unlocks after both", () => {
    assert.equal(
      canUnlockVisaGuidance({ counselingCompleted: false, hasSelectedTarget: false }),
      false,
    );
    assert.equal(
      canUnlockVisaGuidance({ counselingCompleted: true, hasSelectedTarget: false }),
      false,
    );
    assert.equal(
      canUnlockVisaGuidance({ counselingCompleted: false, hasSelectedTarget: true }),
      false,
    );
    assert.equal(
      canUnlockVisaGuidance({ counselingCompleted: true, hasSelectedTarget: true }),
      true,
    );
    assert.ok(
      guidanceLockReason({
        counselingCompleted: true,
        hasSelectedTarget: false,
      })?.includes("counseling"),
    );
  });

  it("matches destination and level, and keeps counselor notes unofficial", () => {
    assert.equal(
      matchCountryGuidance({
        destinationCountry: "GB",
        studyLevel: "undergraduate",
        nationality: "PK",
        rows: [
          {
            country: "GB",
            studyLevel: "undergraduate",
            nationalityApplicability: [],
          },
        ],
      }),
      true,
    );
    assert.equal(
      matchCountryGuidance({
        destinationCountry: "GB",
        studyLevel: "undergraduate",
        nationality: "PK",
        rows: [
          {
            country: "GB",
            studyLevel: "masters",
            nationalityApplicability: [],
          },
        ],
      }),
      false,
    );
    assert.equal(counselorNotesAreOfficial(), false);
    assert.equal(claimsVisaApprovalOrGuarantee("Visa approved in 10 days"), true);
    assert.equal(claimsVisaApprovalOrGuarantee("Indicative processing range"), false);
  });
});

describe("source traceability and quarterly reminders", () => {
  it("traces a published change only when a source revision exists", () => {
    assert.deepEqual(
      sourceTrace({
        entityId: "aaaa1400-0001-4000-8000-0000000000a1",
        sourceFactId: "aaaa1400-0001-4000-8000-0000000000f1",
        revision: 2,
      }),
      {
        traceable: true,
        sourceFactId: "aaaa1400-0001-4000-8000-0000000000f1",
        revision: 2,
      },
    );
    assert.equal(
      sourceTrace({ entityId: "x", sourceFactId: null, revision: 1 }).traceable,
      false,
    );
  });

  it("flags overdue quarterly reviews and upcoming reminders", () => {
    const now = new Date("2026-09-25T00:00:00.000Z");
    assert.equal(
      quarterlyReviewDue({
        now,
        nextReviewAt: new Date("2026-09-01T00:00:00.000Z"),
        verifiedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
      true,
    );
    assert.equal(
      quarterlyReviewDue({
        now,
        nextReviewAt: new Date("2026-12-01T00:00:00.000Z"),
        verifiedAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
      false,
    );
    assert.equal(
      quarterlyReminderNeeded({
        now,
        nextReviewAt: new Date("2026-10-01T00:00:00.000Z"),
      }),
      true,
    );
    assert.equal(
      quarterlyReminderNeeded({
        now,
        nextReviewAt: new Date("2026-12-01T00:00:00.000Z"),
      }),
      false,
    );
    assert.equal(importsNeverAutoPublish(), true);
  });
});

describe("accommodation enrichment and leftover mapping", () => {
  it("maps leftover housing and visa checklist rows without inventing official facts", () => {
    assert.equal(leftoverHousingType("on_campus"), "dorm");
    assert.equal(leftoverHousingType("shared_apartment"), "apartment");
    assert.equal(leftoverDocumentKey("Passport copy"), "passport");
    assert.equal(mealIncludedPreventsDoubleCount(true), true);
    assert.ok(
      mapDirectionsHref({
        latitude: 51.5,
        longitude: -0.1,
        city: "London",
        country: "GB",
      })?.includes("51.5"),
    );
  });
});
