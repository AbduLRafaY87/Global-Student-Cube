import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADVISORY_DISCLAIMER,
  applyAdvisoryEvent,
  canApplyAdvisoryEvent,
  FIT_LABELS,
  isAdvisoryEscalated,
  isAdvisoryOverdue,
  shareableContainsPrivate,
  studentAdvisoryLabel,
  studentVisibleAdvisory,
} from "./advisory";
import {
  applyAssignmentEvent,
  canReassignDuringSession,
  counselorCanSeeCase,
  isProtectedSafety,
  previousCounselorHistoryOnly,
  previousCounselorSees,
  nextCounselorSees,
  validateChangeDetail,
} from "./assignment";
import {
  answersComplete,
  canRateSession,
  countsTowardPublishedMean,
  nextFeedbackState,
  publishedMean,
  STUDENT_FEEDBACK_FIELDS,
} from "./feedback";
import {
  AWAITING_DATE_LABEL,
  applyTaskEvent,
  completionCancelsReminders,
  dueLabel,
  extendDue,
  isOverdue,
} from "./tasks";

describe("advisory state machine", () => {
  it("walks awaiting_summary to delivered without AI", () => {
    const draft = applyAdvisoryEvent("awaiting_summary", "start_draft");
    const review = applyAdvisoryEvent(draft, "submit_review");
    const approved = applyAdvisoryEvent(review, "approve");
    const delivered = applyAdvisoryEvent(approved, "deliver");
    assert.equal(delivered, "delivered");
    assert.equal(studentVisibleAdvisory("draft"), false);
    assert.equal(studentAdvisoryLabel("draft"), "Counselor reviewing");
    assert.equal(studentVisibleAdvisory("approved"), true);
  });

  it("sends quality-flagged records through admin review", () => {
    assert.equal(
      canApplyAdvisoryEvent("counselor_review", "approve", true),
      false,
    );
    assert.equal(
      applyAdvisoryEvent("counselor_review", "flag_quality", true),
      "admin_review",
    );
    assert.equal(applyAdvisoryEvent("admin_review", "request_changes"), "changes_requested");
  });

  it("supersedes an approved version instead of editing it", () => {
    assert.equal(applyAdvisoryEvent("approved", "supersede"), "withdrawn");
    assert.equal(applyAdvisoryEvent("delivered", "supersede"), "withdrawn");
    assert.equal(ADVISORY_DISCLAIMER.includes("indicative"), true);
    assert.equal(FIT_LABELS[5].includes("admission"), false);
  });

  it("marks 24h overdue and 48h escalation from session completion", () => {
    const completed = "2026-09-25T10:00:00.000Z";
    assert.equal(isAdvisoryOverdue(completed, "2026-09-26T09:59:00.000Z"), false);
    assert.equal(isAdvisoryOverdue(completed, "2026-09-26T10:00:00.000Z"), true);
    assert.equal(isAdvisoryEscalated(completed, "2026-09-27T09:59:00.000Z"), false);
    assert.equal(isAdvisoryEscalated(completed, "2026-09-27T10:00:00.000Z"), true);
  });

  it("never copies private notes into the shareable advisory", () => {
    assert.equal(
      shareableContainsPrivate("Shareable guidance", "Confidential company matter"),
      false,
    );
    assert.equal(
      shareableContainsPrivate(
        "Guidance plus Confidential company matter",
        "Confidential company matter",
      ),
      true,
    );
  });
});

describe("feedback rating rules", () => {
  it("rejects ratings unless the session is attended and completed", () => {
    assert.equal(
      canRateSession({ sessionState: "completed", attendanceOutcome: null }),
      true,
    );
    assert.equal(
      canRateSession({ sessionState: "completed", attendanceOutcome: "student_no_show" }),
      false,
    );
    assert.equal(
      canRateSession({ sessionState: "cancelled", attendanceOutcome: null }),
      false,
    );
  });

  it("requires every student field and uses only student ratings for the published mean", () => {
    assert.equal(
      answersComplete(STUDENT_FEEDBACK_FIELDS, {
        clarity: 4,
        helpfulness: 5,
        knowledge: 4,
        relevance: 3,
      }),
      false,
    );
    assert.equal(
      publishedMean({
        studentScores: [4.8, 4.8],
        counselorScores: [1, 1, 1],
        eligibleCount: 2,
      }),
      5,
    );
    assert.equal(
      publishedMean({
        studentScores: [4, 5, 5, 4, 5],
        counselorScores: [1, 1, 1, 1, 1],
        eligibleCount: 5,
      }),
      4.6,
    );
    assert.equal(
      countsTowardPublishedMean({
        direction: "counselor_to_student",
        state: "published_aggregate_eligible",
      }),
      false,
    );
    assert.equal(nextFeedbackState("draft", "submit"), "submitted");
  });
});

describe("assignment handoff and access", () => {
  it("follows active → change_requested → handoff_pending → reassigned", () => {
    const requested = applyAssignmentEvent("active", "request_change");
    const pending = applyAssignmentEvent(requested, "start_handoff");
    assert.equal(applyAssignmentEvent(pending, "reassign"), "reassigned");
    assert.equal(applyAssignmentEvent(requested, "decline"), "active");
    assert.equal(validateChangeDetail("x"), false);
    assert.equal(validateChangeDetail("Needs a different schedule fit."), true);
  });

  it("hides a case from a counselor without a grant and limits the previous counselor", () => {
    assert.equal(
      counselorCanSeeCase({ hasActiveGrant: false, assignmentState: "active" }),
      false,
    );
    assert.equal(
      counselorCanSeeCase({ hasActiveGrant: true, assignmentState: "active" }),
      true,
    );
    assert.equal(
      previousCounselorHistoryOnly({
        assignmentState: "reassigned",
        endedAt: "2026-09-25T00:00:00.000Z",
      }),
      true,
    );
    assert.equal(
      previousCounselorSees({
        category: "Scheduling",
        kind: "improvement_summary",
      }),
      true,
    );
    assert.equal(
      previousCounselorSees({
        category: "Safety",
        kind: "protected_complaint",
      }),
      false,
    );
    assert.equal(isProtectedSafety("Safety"), true);
    assert.equal(nextCounselorSees({ kind: "private_notes" }), false);
    assert.equal(nextCounselorSees({ kind: "approved_advisory" }), true);
    assert.equal(canReassignDuringSession("in_progress"), false);
    assert.equal(canReassignDuringSession("completed"), true);
  });
});

describe("follow-up tasks", () => {
  it("uses Awaiting date when no due date is stored and preserves extension history", () => {
    assert.equal(dueLabel(null), AWAITING_DATE_LABEL);
    assert.equal(isOverdue(null, "2026-09-25T00:00:00.000Z"), false);
    const extension = extendDue({
      previousDueAt: "2026-09-20T00:00:00.000Z",
      nextDueAt: "2026-09-30T00:00:00.000Z",
      reason: "Translation still in progress",
    });
    assert.equal(extension.previousDueAt, "2026-09-20T00:00:00.000Z");
    assert.equal(applyTaskEvent("open", "submit"), "submitted");
    assert.equal(applyTaskEvent("submitted", "request_changes"), "changes_requested");
    assert.equal(applyTaskEvent("submitted", "complete"), "completed");
    assert.equal(completionCancelsReminders("completed"), true);
  });
});
