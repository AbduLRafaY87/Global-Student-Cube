import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canBecomeMentor,
  deriveJourneyState,
  flagInconsistentDates,
  milestoneCanBePublic,
  privateJourneyNotifiesMentor,
  savingAdmissionPublishesOrNotifiesMentor,
  timeToInternship,
  timeToPlacement,
  type JourneyMilestone,
} from "./milestones";

function row(
  kind: JourneyMilestone["kind"],
  occurredOn: string | null,
): JourneyMilestone {
  return {
    kind,
    occurredOn,
    details: {},
    verification: "self_reported",
    exceptionNote: null,
  };
}

describe("inconsistent milestone dates", () => {
  it("flags graduation before enrolment and does not invent a positive duration", () => {
    const flags = flagInconsistentDates([
      row("university_start", "2026-09-01"),
      row("graduation", "2026-06-01"),
      row("first_job", "2026-05-01"),
    ]);
    assert.ok(flags.some((flag) => flag.code === "GRADUATION_BEFORE_START"));
    assert.ok(flags.some((flag) => flag.code === "PRE_GRADUATION_OFFER"));
    assert.ok(flags.every((flag) => flag.preserveProvenance));
    assert.ok(flags.every((flag) => flag.inventsPositiveDuration === false));
    assert.deepEqual(
      timeToPlacement([
        row("graduation", "2026-09-01"),
        row("first_job", "2026-06-01"),
      ]),
      { days: null, preGraduation: true },
    );
    assert.equal(
      timeToInternship([
        row("university_start", "2026-09-01"),
        row("internship", "2026-08-01"),
      ]),
      null,
    );
  });
});

describe("journey consent independence", () => {
  const consents = {
    publicationConsent: true,
    nameConsent: false,
    imageConsent: false,
    spotlightConsent: false,
    mentorNamed: false,
    mentorConsent: false,
    parentNamed: false,
    parentConsent: false,
  };

  it("keeps private saves unpublished and publication consent independent of name consent", () => {
    assert.equal(savingAdmissionPublishesOrNotifiesMentor(), false);
    assert.equal(privateJourneyNotifiesMentor(), false);
    assert.equal(
      milestoneCanBePublic({
        ...consents,
        adminApproved: true,
        selected: true,
      }),
      true,
    );
    assert.equal(
      milestoneCanBePublic({
        ...consents,
        publicationConsent: false,
        adminApproved: true,
        selected: true,
      }),
      false,
    );
    assert.equal(
      milestoneCanBePublic({
        ...consents,
        adminApproved: true,
        selected: false,
      }),
      false,
    );
    assert.equal(
      deriveJourneyState([
        row("university_start", "2026-09-01"),
        row("graduation", "2029-06-01"),
      ]),
      "graduated",
    );
    assert.equal(canBecomeMentor("graduated"), true);
    assert.equal(canBecomeMentor("not_started"), false);
  });
});
