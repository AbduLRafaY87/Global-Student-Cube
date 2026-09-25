import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRatingToLog,
  countUniqueMentees,
  creditOnce,
  MENTORING_POINTS,
  nextLogStateAfterAdmin,
  pendingApprovalPoints,
  publishedAggregateRating,
  spendablePoints,
  topTen,
  verifiedMinutes,
  verifiedSessionCount,
  type ContributionSession,
} from "./contributions";
import {
  noneChallengeIsExclusive,
  unfinishedMeetingCannotEarnPoints,
  validateAlumniMenteeFeedback,
  validateMentorFeedback,
  validateParentMenteeFeedback,
} from "./feedback";
import {
  canReadStudentCase,
  mentorshipGrantsCaseAccess,
  mentorAndParentFamiliesIsolated,
  oneActiveMentoringAllowed,
  parentPublicCardOmitsChildData,
  requestDoesNotGrantFinanceOrTranscript,
} from "./isolation";
import {
  CHOOSE_EXACTLY_THREE,
  isPublishedDirectoryMentor,
  ratingLabel,
  twoHoursAloneDoesNotVerify,
  validateAlumniMentorProfile,
  validateParentMentorProfile,
  type AlumniMentorProfileInput,
  type ParentMentorProfileInput,
} from "./profiles";
import {
  bookingAllowed,
  canTransitionRequest,
  canWithdraw,
  messagingAllowed,
  privateConnectBlocked,
  requestPairsAllowed,
} from "./requests";
import {
  ALUMNI_TOPIC_IDS,
  INDUSTRY_IDS,
  INDUSTRY_OTHER_ID,
  PARENT_TOPIC_IDS,
} from "./taxonomy";

function alumniInput(
  overrides: Partial<AlumniMentorProfileInput> = {},
): AlumniMentorProfileInput {
  return {
    studyStatus: "graduated",
    universityAttended: "SYNTHETIC University",
    course: "Computer Science",
    graduationYear: 2020,
    graduationIsAnticipated: false,
    topics: ALUMNI_TOPIC_IDS.slice(0, 3),
    industries: [INDUSTRY_IDS[0] ?? "industry-business-administration"],
    industriesOther: "",
    currentOrganization: "",
    role: "",
    employerBusinessUrl: "",
    professionalLink: "",
    monthlyAvailabilityHours: 2,
    experienceYears: 1,
    reflection: "I wish I knew how to budget abroad.",
    ...overrides,
  };
}

function parentInput(
  overrides: Partial<ParentMentorProfileInput> = {},
): ParentMentorProfileInput {
  return {
    educationLevel: "undergraduate",
    topics: PARENT_TOPIC_IDS.slice(0, 1),
    monthlyAvailabilityHours: 2,
    experienceYears: 3,
    reflection: "",
    ...overrides,
  };
}

function session(
  menteeId: string,
  overrides: Partial<ContributionSession> = {},
): ContributionSession {
  return {
    menteeId,
    minutes: 30,
    logState: "credited",
    hasRating: true,
    ...overrides,
  };
}

describe("alumni and parent taxonomies", () => {
  it("supplies complete annex leaf counts and keeps families isolated", () => {
    assert.equal(ALUMNI_TOPIC_IDS.length, 37);
    assert.equal(PARENT_TOPIC_IDS.length, 8);
    assert.equal(INDUSTRY_IDS.length, 64);
    assert.ok(INDUSTRY_IDS.includes(INDUSTRY_OTHER_ID));
    assert.equal(mentorAndParentFamiliesIsolated(ALUMNI_TOPIC_IDS, PARENT_TOPIC_IDS), true);
  });
});

describe("mentor profile validation", () => {
  it("requires exactly three alumni topics and rejects a fourth", () => {
    assert.equal(validateAlumniMentorProfile(alumniInput()).length, 0);
    const fourth = validateAlumniMentorProfile(
      alumniInput({ topics: ALUMNI_TOPIC_IDS.slice(0, 4) }),
    );
    assert.ok(fourth.some((error) => error.message === CHOOSE_EXACTLY_THREE));
  });

  it("keeps current-student status from masquerading as graduation", () => {
    const errors = validateAlumniMentorProfile(
      alumniInput({
        studyStatus: "currently_studying",
        graduationIsAnticipated: false,
      }),
    );
    assert.ok(errors.some((error) => error.path === "graduationIsAnticipated"));
  });

  it("lets a parent profile complete with one to three topics", () => {
    assert.equal(validateParentMentorProfile(parentInput()).length, 0);
    assert.equal(
      validateParentMentorProfile(parentInput({ topics: PARENT_TOPIC_IDS.slice(0, 3) })).length,
      0,
    );
    assert.ok(
      validateParentMentorProfile(parentInput({ topics: PARENT_TOPIC_IDS.slice(0, 4) })).length > 0,
    );
    assert.ok(validateParentMentorProfile(parentInput({ topics: [] })).length > 0);
  });

  it("does not treat two hours as a verified badge", () => {
    assert.equal(twoHoursAloneDoesNotVerify(2, "pending"), true);
    assert.equal(isPublishedDirectoryMentor({ verificationState: "pending", published: true }), false);
    assert.equal(isPublishedDirectoryMentor({ verificationState: "approved", published: true }), true);
    assert.equal(ratingLabel(null), "Not yet rated");
  });
});

describe("request states", () => {
  it("follows draft requested accepted declined withdrawn expired", () => {
    assert.equal(
      canTransitionRequest({ from: "draft", to: "requested", actor: "mentee" }),
      true,
    );
    assert.equal(
      canTransitionRequest({ from: "requested", to: "accepted", actor: "mentor" }),
      true,
    );
    assert.equal(
      canTransitionRequest({ from: "requested", to: "declined", actor: "mentor" }),
      true,
    );
    assert.equal(
      canTransitionRequest({ from: "requested", to: "withdrawn", actor: "mentee" }),
      true,
    );
    assert.equal(
      canTransitionRequest({ from: "requested", to: "expired", actor: "worker" }),
      true,
    );
    assert.equal(
      canTransitionRequest({ from: "accepted", to: "declined", actor: "mentor" }),
      false,
    );
    assert.equal(canWithdraw("accepted"), false);
    assert.equal(messagingAllowed("requested"), false);
    assert.equal(bookingAllowed("accepted"), true);
  });

  it("supports student-to-alumni and parent-to-parent only", () => {
    assert.equal(requestPairsAllowed({ menteeKind: "student", mentorKind: "alumni" }), true);
    assert.equal(requestPairsAllowed({ menteeKind: "parent", mentorKind: "parent" }), true);
    assert.equal(requestPairsAllowed({ menteeKind: "student", mentorKind: "parent" }), false);
    assert.equal(requestPairsAllowed({ menteeKind: "parent", mentorKind: "alumni" }), false);
  });

  it("blocks private contact for minors without a verified guardian", () => {
    assert.equal(
      privateConnectBlocked({
        blocked: false,
        restricted: false,
        isMinor: true,
        hasVerifiedGuardian: false,
      }),
      true,
    );
    assert.equal(
      privateConnectBlocked({
        blocked: false,
        restricted: false,
        isMinor: true,
        hasVerifiedGuardian: true,
      }),
      false,
    );
  });
});

describe("verified contribution counting", () => {
  it("counts a mentee once and ignores unverified sessions", () => {
    const sessions = [
      session("m1"),
      session("m1", { minutes: 30 }),
      session("m2", { logState: "submitted", hasRating: false }),
      session("m3", { logState: "reward_eligible" }),
    ];
    assert.equal(countUniqueMentees(sessions), 2);
    assert.equal(verifiedSessionCount(sessions), 3);
    assert.equal(verifiedMinutes(sessions), 90);
    assert.equal(spendablePoints(sessions), MENTORING_POINTS * 2);
    assert.equal(pendingApprovalPoints(sessions), MENTORING_POINTS * 2);
  });

  it("awards 25 points once after logged, rated and admin-approved completion", () => {
    assert.equal(
      nextLogStateAfterAdmin({ decision: "approved", hasRating: false }),
      "approved_awaiting_rating",
    );
    assert.equal(applyRatingToLog("approved_awaiting_rating"), "reward_eligible");
    assert.equal(creditOnce("reward_eligible"), "credited");
    assert.equal(creditOnce("credited"), "credited");
    assert.equal(unfinishedMeetingCannotEarnPoints("in_progress"), true);
  });

  it("hides published aggregates until five distinct raters and sorts the top ten", () => {
    assert.equal(publishedAggregateRating([5, 4], 4), null);
    assert.equal(publishedAggregateRating([5, 4, 3, 5, 4], 5), 4.2);
    const top = topTen([
      { mentorId: "b", rating: 5, uniqueMentees: 1, verifiedMinutes: 30 },
      { mentorId: "a", rating: 5, uniqueMentees: 2, verifiedMinutes: 30 },
    ]);
    assert.equal(top[0]?.mentorId, "a");
  });
});

describe("mentor isolation from cases and the other family", () => {
  it("never treats a mentoring connection as a student-case grant", () => {
    assert.equal(mentorshipGrantsCaseAccess(), false);
    assert.equal(
      canReadStudentCase({
        hasLiveGrant: false,
        hasMentorConnection: true,
        hasParentMentorConnection: true,
        mentorKind: "alumni",
      }),
      false,
    );
    assert.equal(
      canReadStudentCase({
        hasLiveGrant: true,
        hasMentorConnection: false,
        hasParentMentorConnection: false,
        mentorKind: null,
      }),
      true,
    );
    assert.equal(requestDoesNotGrantFinanceOrTranscript(true, false, false), true);
  });

  it("omits child education and finances from parent mentor cards", () => {
    assert.equal(
      parentPublicCardOmitsChildData({
        displayName: "Parent mentor",
        topics: ["parent-admissions-university-process"],
      }),
      true,
    );
    assert.equal(
      parentPublicCardOmitsChildData({
        displayName: "Parent mentor",
        childName: "Ada",
      }),
      false,
    );
  });

  it("caps one active mentoring appointment separately from counseling", () => {
    assert.equal(
      oneActiveMentoringAllowed({ existingActiveMentoring: 0, kind: "mentoring" }),
      true,
    );
    assert.equal(
      oneActiveMentoringAllowed({ existingActiveMentoring: 1, kind: "mentoring" }),
      false,
    );
    assert.equal(
      oneActiveMentoringAllowed({ existingActiveMentoring: 1, kind: "counseling" }),
      true,
    );
  });
});

describe("mutual feedback questionnaires", () => {
  it("requires alumni mentee ratings and an exclusive None challenge", () => {
    assert.equal(
      validateAlumniMenteeFeedback({
        clarity: "Clear",
        relevance: "Agree",
        preparedKnowledgeable: "Agree",
        actionClarity: "Somewhat clear",
        satisfaction: "Satisfied",
        challenges: ["None"],
      }),
      true,
    );
    assert.equal(noneChallengeIsExclusive(["None", "Lack of clarity"]), false);
  });

  it("validates mentor and parent-mentee questionnaires", () => {
    assert.equal(
      validateMentorFeedback({
        preparation: "Prepared",
        engagement: "Engaged",
        likelyFollowthrough: "Agree",
        overallExperience: "Good",
        technicalIssues: "No issues",
        scopeDifficulty: "Slightly",
      }),
      true,
    );
    assert.equal(
      validateParentMenteeFeedback({
        clarity: "Good",
        usefulness: "Agree",
        organization: "Agree",
        practicality: "Practical",
        recommendation: "Yes",
      }),
      true,
    );
  });
});
