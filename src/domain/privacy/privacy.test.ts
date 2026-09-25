import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTRIBUTION_CAUTION,
  conversionClaimAllowed,
  publishMetric,
  unreportedAlumniAreFailures,
} from "./analytics";
import {
  canPseudonymizeLedgers,
  deletionOrder,
  deletionRemovesOtherPersonData,
  retainedCollectionsAfterErasure,
} from "./deletion";
import {
  buildExportPackage,
  exportContainsOnlySubject,
  recordingConsentWithdrawalDeletesAccount,
} from "./export";
import {
  otpSuccessBypassesEmailOrGuardian,
  phoneOtpIsLoginMfa,
  registerOtpAttempt,
  storesRawOtp,
} from "./otp";
import {
  canReadProtectedSafetyComplaint,
  counselorReceivesFullSafetyComplaint,
} from "./safety";

describe("export contains only the user's data", () => {
  it("keeps own rows and drops other notes and protected safety evidence", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    const otherId = "22222222-2222-4222-8222-222222222222";
    const pkg = buildExportPackage(
      accountId,
      [
        {
          collection: "user_profiles",
          ownerAccountId: accountId,
          subjectAccountId: accountId,
          confidentialToOther: false,
          isProtectedSafety: false,
        },
        {
          collection: "private_notes",
          ownerAccountId: otherId,
          subjectAccountId: accountId,
          confidentialToOther: true,
          isProtectedSafety: false,
        },
        {
          collection: "safety_evidence",
          ownerAccountId: accountId,
          subjectAccountId: otherId,
          confidentialToOther: false,
          isProtectedSafety: true,
        },
        {
          collection: "journey_milestones",
          ownerAccountId: otherId,
          subjectAccountId: otherId,
          confidentialToOther: false,
          isProtectedSafety: false,
        },
      ],
      "2026-09-25T00:00:00.000Z",
    );
    assert.equal(exportContainsOnlySubject(accountId, pkg), true);
    assert.equal(pkg.records.length, 1);
    assert.equal(pkg.records[0]?.collection, "user_profiles");
    assert.equal(recordingConsentWithdrawalDeletesAccount(), false);
  });
});

describe("deletion order respects ledgers, audit and consent retention", () => {
  it("suspends first, keeps immutable ledgers, and honors legal holds", () => {
    assert.deepEqual(deletionOrder().slice(0, 3), [
      "suspend_access",
      "revoke_sessions_and_grants",
      "hide_public_projections",
    ]);
    assert.deepEqual([...retainedCollectionsAfterErasure()], [
      "reward_entries",
      "audit_events",
      "consent_events",
    ]);
    assert.equal(deletionRemovesOtherPersonData(), false);
    assert.equal(
      canPseudonymizeLedgers({
        holds: [
          {
            resourceType: "accounts",
            resourceId: "11111111-1111-4111-8111-111111111111",
            authority: "legal",
            reason: "Documented hold",
            reviewAt: "2026-12-01T00:00:00.000Z",
            releasedAt: null,
          },
        ],
        now: "2026-10-26T00:00:00.000Z",
        dueAt: "2026-10-25T00:00:00.000Z",
      }),
      false,
    );
    assert.equal(
      canPseudonymizeLedgers({
        holds: [],
        now: "2026-10-26T00:00:00.000Z",
        dueAt: "2026-10-25T00:00:00.000Z",
      }),
      true,
    );
  });
});

describe("OTP attempt limit", () => {
  it("invalidates the challenge after five failed attempts and never stores a raw OTP", () => {
    const expiresAt = "2026-09-25T00:05:00.000Z";
    const now = "2026-09-25T00:01:00.000Z";
    let count = 0;
    let last = registerOtpAttempt({ attemptCount: count, expiresAt, now });
    for (let index = 0; index < 5; index += 1) {
      last = registerOtpAttempt({ attemptCount: count, expiresAt, now });
      count = last.nextAttemptCount;
    }
    assert.equal(count, 5);
    assert.equal(last.invalidated, true);
    const sixth = registerOtpAttempt({ attemptCount: count, expiresAt, now });
    assert.equal(sixth.accepted, false);
    assert.equal(sixth.invalidated, true);
    assert.equal(storesRawOtp(), false);
    assert.equal(phoneOtpIsLoginMfa(), false);
    assert.equal(otpSuccessBypassesEmailOrGuardian(), false);
  });
});

describe("safety complaint visibility", () => {
  it("hides protected safety from counselors and routine staff", () => {
    assert.equal(counselorReceivesFullSafetyComplaint(), false);
    assert.equal(
      canReadProtectedSafetyComplaint({
        isProtected: true,
        hasSafetyPermission: false,
      }),
      false,
    );
    assert.equal(
      canReadProtectedSafetyComplaint({
        isProtected: true,
        hasSafetyPermission: true,
      }),
      true,
    );
  });
});

describe("analytics attribution cautions", () => {
  it("suppresses small cohorts and never publishes a conversion claim", () => {
    const metric = publishMetric("Placement within 180 days", {
      numerator: 2,
      denominator: 4,
      unknown: 3,
      cohortSize: 7,
      selfReported: 4,
      verified: 0,
    });
    assert.equal(metric.suppressed, true);
    assert.equal(metric.numerator, null);
    assert.equal(metric.causalClaim, false);
    assert.equal(conversionClaimAllowed(), false);
    assert.equal(unreportedAlumniAreFailures(), false);
    assert.ok(ATTRIBUTION_CAUTION.includes("not causal"));
  });
});
