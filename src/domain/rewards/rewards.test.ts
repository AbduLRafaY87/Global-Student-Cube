import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarMonths,
  applyConcurrentReserves,
  canReserve,
  hoursFromMinutes,
  inactivityDeadline,
  isGiftCardFulfillmentEnabled,
  ledgerReconciles,
  mentoringCreditIdempotency,
  projectLedger,
  rejectClientSubmittedTotals,
  referralCreditIdempotency,
  tenSessionsOneMenteeIsNotSilver,
  tierFromUniqueMentees,
  type PointsEntry,
} from "./ledger";
import { certificateHoursLabel, generateRecognitionPdf } from "./pdf";
import { referralQrSvg } from "./qr";
import {
  displayReferralStatus,
  referralIneligible,
  referralQualifies,
  sharingAwardsPoints,
} from "./referrals";
import {
  canTransitionRedemption,
  fulfillmentNeverInstant,
  giftCardCanActivate,
  RECOGNITION_PACK_COST,
} from "./redemptions";

function earn(sourceId: string, kind: "earn_mentoring" | "earn_referral" = "earn_mentoring"): PointsEntry {
  return { eventType: kind, points: 25, sourceId };
}

describe("immutable ledger projections", () => {
  it("reconciles the SYNTHETIC 20-session plus referral example", () => {
    const sessions = Array.from({ length: 20 }, (_, index) => earn(`session-${index}`));
    const withReferral = [...sessions, earn("student-1", "earn_referral")];
    const reserved: PointsEntry[] = [
      ...withReferral,
      { eventType: "reserve", points: 500, sourceId: "redemption-1" },
    ];
    const reservedProjection = projectLedger(reserved, 5);
    assert.equal(reservedProjection.totalEarned, 525);
    assert.equal(reservedProjection.reserved, 500);
    assert.equal(reservedProjection.available, 25);
    assert.equal(reservedProjection.tier, "star");
    assert.equal(ledgerReconciles(reserved, 5), true);

    const fulfilled: PointsEntry[] = [
      ...reserved,
      { eventType: "redeem", points: 500, sourceId: "redemption-1" },
      { eventType: "release", points: 500, sourceId: "redemption-1" },
    ];
    const fulfilledProjection = projectLedger(fulfilled, 5);
    assert.equal(fulfilledProjection.redeemed, 500);
    assert.equal(fulfilledProjection.reserved, 0);
    assert.equal(fulfilledProjection.available, 25);
    assert.equal(ledgerReconciles(fulfilled, 5), true);

    const expired: PointsEntry[] = [
      ...fulfilled,
      { eventType: "expire", points: 25, sourceId: "inactivity" },
    ];
    const expiredProjection = projectLedger(expired, 5);
    assert.equal(expiredProjection.available, 0);
    assert.equal(expiredProjection.expired, 25);
    assert.equal(expiredProjection.totalEarned, 525);
    assert.equal(ledgerReconciles(expired, 5), true);
  });

  it("does not let ten sessions with one mentee award Silver", () => {
    assert.equal(tenSessionsOneMenteeIsNotSilver(10, 1), true);
    assert.equal(tierFromUniqueMentees(1), "none");
    assert.equal(tierFromUniqueMentees(5), "star");
    assert.equal(tierFromUniqueMentees(10), "silver");
  });

  it("rejects forged client totals and duplicate credit keys", () => {
    assert.equal(rejectClientSubmittedTotals({ catalogCode: "recognition-pack-500" }), false);
    assert.equal(rejectClientSubmittedTotals({ available: 9999 }), true);
    assert.equal(rejectClientSubmittedTotals({ totalEarned: 25 }), true);
    assert.equal(mentoringCreditIdempotency("b1"), "earn_mentoring:b1");
    assert.equal(referralCreditIdempotency("a1"), "earn_referral:a1");
  });
});

describe("concurrent redemption cannot overspend", () => {
  it("accepts only the first reservation when two 500-point requests race a 500 balance", () => {
    assert.equal(canReserve(500, RECOGNITION_PACK_COST), true);
    assert.equal(canReserve(499, RECOGNITION_PACK_COST), false);
    assert.deepEqual(applyConcurrentReserves(500, [500, 500]), [500]);
    assert.deepEqual(applyConcurrentReserves(1000, [500, 500]), [500, 500]);
  });
});

describe("expiry job calendar arithmetic", () => {
  it("warns at five months and expires at six, clamping month-end dates", () => {
    const last = new Date(Date.UTC(2026, 0, 31));
    const five = addCalendarMonths(last, 5);
    const six = addCalendarMonths(last, 6);
    assert.equal(five.toISOString().slice(0, 10), "2026-06-30");
    assert.equal(six.toISOString().slice(0, 10), "2026-07-31");
    assert.equal(inactivityDeadline(last, new Date(Date.UTC(2026, 5, 30))).warn, true);
    assert.equal(inactivityDeadline(last, new Date(Date.UTC(2026, 6, 31))).expire, true);
    assert.equal(inactivityDeadline(last, new Date(Date.UTC(2026, 4, 30))).expire, false);
  });
});

describe("referrals and catalog", () => {
  it("awards nothing for sharing or clicking and requires Modules 2+3", () => {
    assert.equal(sharingAwardsPoints(), false);
    assert.equal(
      referralQualifies({
        studentApproved: true,
        module2Complete: true,
        module3Complete: false,
        financeDeclined: true,
        financeComplete: false,
      }),
      false,
    );
    assert.equal(
      referralQualifies({
        studentApproved: true,
        module2Complete: true,
        module3Complete: true,
        financeDeclined: true,
        financeComplete: false,
      }),
      true,
    );
    assert.equal(
      referralIneligible({
        selfReferral: true,
        existingAccount: false,
        duplicateIdentity: false,
        parentInvitingLinkedChild: false,
      }),
      true,
    );
    assert.equal(displayReferralStatus("credited"), "awarded");
    assert.equal(displayReferralStatus("visited"), "invited");
  });

  it("keeps gift cards disabled until funded fulfillment is enabled", () => {
    assert.equal(
      giftCardCanActivate({ featureEnabled: false, funded: true, inventory: 10 }),
      false,
    );
    assert.equal(
      giftCardCanActivate({ featureEnabled: true, funded: true, inventory: 1 }),
      true,
    );
    assert.equal(isGiftCardFulfillmentEnabled(undefined), false);
    assert.equal(fulfillmentNeverInstant("10–12 working days"), true);
    assert.equal(canTransitionRedemption("reserved", "fulfilling", "admin"), true);
  });
});

describe("certificates", () => {
  it("states 90 minutes as 1.5 hours and emits a PDF without a 20-hour claim", () => {
    assert.equal(hoursFromMinutes(90), "1.5");
    assert.equal(certificateHoursLabel(90), "1.5 hours");
    const pdf = generateRecognitionPdf({
      kind: "certificate",
      displayName: "Ada Mentor",
      issueId: "ISS-1",
      issuedOn: "2026-09-25",
      dateFrom: "2026-03-01",
      dateTo: "2026-09-01",
      minutes: 90,
      hoursLabel: "1.5 hours",
    });
    const text = new TextDecoder().decode(pdf);
    assert.ok(text.startsWith("%PDF-1.4"));
    assert.ok(text.includes("1.5 hours"));
    assert.equal(text.includes("20 hours"), false);
    assert.ok(referralQrSvg("https://example.test/r/abc").includes("width=\"192\""));
  });
});
