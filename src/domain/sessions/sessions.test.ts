import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  counselorAbsenceEscalates,
  isNoShowWindow,
  joinWindowOpen,
  reconcileAttendance,
  tickNoShow,
} from "./attendance";
import {
  canStartRecording,
  isMinorStudent,
  lateJoinRosterVersion,
  nextRecordingState,
  recordingAfterLateJoin,
  recordingAfterWithdrawal,
} from "./consent";
import {
  applySessionEvent,
  canApplySessionEvent,
  isRewardableCompleted,
  SESSION_EVENTS,
  SESSION_STATES,
  SESSION_TRANSITIONS,
  type SessionEvent,
  type SessionState,
} from "./state";
import {
  adapterFailureKeepsBooking,
  calendarFailureLinkStatus,
  canCancelAppointment,
  canReschedule,
  hasSingleActiveAppointment,
  occupancyConflicts,
  SESSION_BUFFER_MINUTES,
  SESSION_MINUTES,
  videoFailureLinkStatus,
} from "./booking";
import { sessionStatusLabel } from "./display";

const START = "2026-09-25T10:00:00.000Z";
const T_PLUS_9 = "2026-09-25T10:09:00.000Z";
const T_PLUS_10 = "2026-09-25T10:10:00.000Z";
const JOIN_OPEN = "2026-09-25T09:50:00.000Z";
const TOO_EARLY = "2026-09-25T09:49:00.000Z";

describe("session state transitions", () => {
  const table: Array<[SessionState, SessionEvent, SessionState | null]> = [
    ["scheduled", "open_join_window", "waiting"],
    ["scheduled", "start_session", null],
    ["scheduled", "end_session", null],
    ["scheduled", "complete_session", null],
    ["scheduled", "interrupt", "interrupted"],
    ["waiting", "start_session", "in_progress"],
    ["waiting", "end_session", "ended"],
    ["waiting", "interrupt", "interrupted"],
    ["waiting", "complete_session", null],
    ["in_progress", "end_session", "ended"],
    ["in_progress", "interrupt", "interrupted"],
    ["in_progress", "complete_session", null],
    ["ended", "complete_session", "completed"],
    ["ended", "interrupt", null],
    ["completed", "require_rebooking", null],
    ["interrupted", "require_rebooking", "rebooking_required"],
    ["interrupted", "complete_session", null],
    ["rebooking_required", "complete_session", null],
  ];

  for (const [from, event, expected] of table) {
    it(`${from} + ${event} => ${expected ?? "rejected"}`, () => {
      if (expected === null) {
        assert.equal(canApplySessionEvent(from, event), false);
        assert.throws(() => applySessionEvent(from, event));
        return;
      }
      assert.equal(applySessionEvent(from, event), expected);
    });
  }

  it("covers every defined transition exactly once in the table", () => {
    const defined: string[] = [];
    for (const state of SESSION_STATES) {
      for (const event of SESSION_EVENTS) {
        if (SESSION_TRANSITIONS[state][event]) {
          defined.push(`${state}:${event}`);
        }
      }
    }
    const covered = table
      .filter((row) => row[2] !== null)
      .map(([from, event]) => `${from}:${event}`);
    assert.deepEqual([...covered].sort(), [...defined].sort());
  });

  it("does not treat an interrupted technical failure as a completed rewardable session", () => {
    assert.equal(isRewardableCompleted("interrupted", null), false);
    assert.equal(isRewardableCompleted("rebooking_required", null), false);
    assert.equal(isRewardableCompleted("completed", "student_no_show"), false);
    assert.equal(isRewardableCompleted("completed", null), true);
  });
});

describe("no-show timing", () => {
  it("keeps the join window closed until ten minutes before start", () => {
    assert.equal(joinWindowOpen(START, TOO_EARLY), false);
    assert.equal(joinWindowOpen(START, JOIN_OPEN), true);
  });

  it("does not mark a no-show before ten minutes after start", () => {
    assert.equal(isNoShowWindow(START, T_PLUS_9), false);
    assert.equal(
      tickNoShow({
        startsAt: START,
        now: T_PLUS_9,
        studentJoined: false,
        counselorJoined: true,
      }),
      null,
    );
  });

  it("marks a provisional no-show at ten minutes when a participant is missing", () => {
    assert.equal(
      tickNoShow({
        startsAt: START,
        now: T_PLUS_10,
        studentJoined: false,
        counselorJoined: true,
      }),
      "provisional_no_show",
    );
    assert.equal(
      tickNoShow({
        startsAt: START,
        now: T_PLUS_10,
        studentJoined: true,
        counselorJoined: false,
      }),
      "provisional_no_show",
    );
  });

  it("reconciles provider intervals into terminal outcomes and ignores browser-only presence", () => {
    assert.equal(
      reconcileAttendance({
        startsAt: START,
        now: T_PLUS_10,
        intervals: [
          {
            participantRole: "counselor",
            joinedAt: START,
            leftAt: null,
            evidenceType: "provider_verified",
          },
        ],
      }),
      "student_no_show",
    );
    assert.equal(
      reconcileAttendance({
        startsAt: START,
        now: T_PLUS_10,
        intervals: [
          {
            participantRole: "student",
            joinedAt: START,
            leftAt: null,
            evidenceType: "provider_verified",
          },
        ],
      }),
      "counselor_no_show",
    );
    assert.equal(
      reconcileAttendance({
        startsAt: START,
        now: T_PLUS_10,
        intervals: [],
      }),
      "both_no_show",
    );
    assert.equal(
      reconcileAttendance({
        startsAt: START,
        now: T_PLUS_10,
        intervals: [
          {
            participantRole: "student",
            joinedAt: START,
            leftAt: null,
            evidenceType: "manual_reviewed",
          },
        ],
      }),
      "both_no_show",
    );
    assert.equal(counselorAbsenceEscalates("counselor_no_show"), true);
    assert.equal(counselorAbsenceEscalates("student_no_show"), false);
  });
});

describe("recording consent", () => {
  const student = "11111111-1111-4111-8111-111111111111";
  const counselor = "22222222-2222-4222-8222-222222222222";

  it("withdraws consent by stopping recording immediately", () => {
    assert.equal(recordingAfterWithdrawal(), "stopped");
    assert.equal(
      nextRecordingState({
        recordingState: "recording",
        rosterVersion: 1,
        presentParticipantIds: [student, counselor],
        events: [
          {
            participantId: student,
            rosterVersion: 1,
            decision: false,
            occurredAt: START,
            guardianConsentEventId: null,
          },
        ],
        actorId: student,
        decision: false,
        isMinorStudent: false,
        guardianAuthorized: false,
        actorIsGuardian: false,
        accountLevelConsent: true,
        recordingFeatureEnabled: true,
        adapterCanEnforceRoster: true,
      }),
      "stopped",
    );
    assert.equal(
      canStartRecording({
        recordingState: "stopped",
        rosterVersion: 1,
        presentParticipantIds: [student, counselor],
        events: [],
        isMinorStudent: false,
        guardianConsented: false,
        recordingFeatureEnabled: true,
        adapterCanEnforceRoster: true,
      }),
      false,
    );
  });

  it("requires verified guardian consent for a minor and never inherits a late join", () => {
    assert.equal(isMinorStudent("2010-01-01", "2026-09-25T00:00:00.000Z"), true);
    assert.equal(isMinorStudent("2007-01-01", "2026-09-25T00:00:00.000Z"), false);
    assert.equal(
      nextRecordingState({
        recordingState: "consent_requested",
        rosterVersion: 1,
        presentParticipantIds: [student, counselor],
        events: [
          {
            participantId: student,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
          {
            participantId: counselor,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
        ],
        actorId: student,
        decision: true,
        isMinorStudent: true,
        guardianAuthorized: false,
        actorIsGuardian: false,
        accountLevelConsent: true,
        recordingFeatureEnabled: true,
        adapterCanEnforceRoster: true,
      }),
      "consent_requested",
    );
    assert.equal(
      canStartRecording({
        recordingState: "consented",
        rosterVersion: 1,
        presentParticipantIds: [student, counselor],
        events: [
          {
            participantId: student,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
          {
            participantId: counselor,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
        ],
        isMinorStudent: true,
        guardianConsented: false,
        recordingFeatureEnabled: true,
        adapterCanEnforceRoster: true,
      }),
      false,
    );
    assert.equal(lateJoinRosterVersion(1), 2);
    assert.equal(recordingAfterLateJoin(), "consent_requested");
  });

  it("keeps recording off when the adapter cannot enforce roster-safe recording", () => {
    assert.equal(
      canStartRecording({
        recordingState: "consented",
        rosterVersion: 1,
        presentParticipantIds: [student, counselor],
        events: [
          {
            participantId: student,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
          {
            participantId: counselor,
            rosterVersion: 1,
            decision: true,
            occurredAt: START,
            guardianConsentEventId: null,
          },
        ],
        isMinorStudent: false,
        guardianConsented: false,
        recordingFeatureEnabled: true,
        adapterCanEnforceRoster: false,
      }),
      false,
    );
  });
});

describe("booking invariants", () => {
  it("uses 30-minute sessions and a 15-minute buffer (T071)", () => {
    assert.equal(SESSION_MINUTES, 30);
    assert.equal(SESSION_BUFFER_MINUTES, 15);
    assert.equal(
      occupancyConflicts("2026-09-25T10:00:00.000Z", "2026-09-25T10:44:00.000Z"),
      true,
    );
    assert.equal(
      occupancyConflicts("2026-09-25T10:00:00.000Z", "2026-09-25T10:45:00.000Z"),
      false,
    );
  });

  it("allows reschedule only 48 hours before start (T072)", () => {
    assert.equal(canReschedule(START, "2026-09-23T10:00:00.000Z"), true);
    assert.equal(canReschedule(START, "2026-09-23T10:00:01.000Z"), false);
  });

  it("keeps the booking confirmed when calendar or video adapters fail (T073/T074)", () => {
    assert.deepEqual(adapterFailureKeepsBooking(calendarFailureLinkStatus()), {
      confirmed: true,
      linkStatus: "calendar_attention",
    });
    assert.deepEqual(adapterFailureKeepsBooking(videoFailureLinkStatus()), {
      confirmed: true,
      linkStatus: "preparing",
    });
    assert.equal(sessionStatusLabel("scheduled", "preparing"), "Preparing link");
  });

  it("rejects a second active appointment and overlapping occupancy (T075/T076)", () => {
    assert.equal(hasSingleActiveAppointment(1), true);
    assert.equal(hasSingleActiveAppointment(2), false);
  });

  it("uses the same 48-hour notice for cancel (T077)", () => {
    assert.equal(canCancelAppointment(START, "2026-09-23T10:00:00.000Z"), true);
    assert.equal(canCancelAppointment(START, "2026-09-23T10:00:01.000Z"), false);
  });
});
