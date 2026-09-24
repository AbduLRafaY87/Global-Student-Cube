export const JOIN_LEAD_MS = 10 * 60 * 1000;
export const NO_SHOW_GRACE_MS = 10 * 60 * 1000;
export const SESSION_LENGTH_MS = 30 * 60 * 1000;

export const ATTENDANCE_OUTCOMES = [
  "provisional_no_show",
  "student_no_show",
  "counselor_no_show",
  "both_no_show",
  "attendance_disputed",
] as const;

export type AttendanceOutcome = (typeof ATTENDANCE_OUTCOMES)[number];

export type AttendanceEvidenceType = "provider_verified" | "manual_reviewed";

export interface AttendanceInterval {
  participantRole: "student" | "counselor";
  joinedAt: string;
  leftAt: string | null;
  evidenceType: AttendanceEvidenceType;
}

export interface AttendanceTickInput {
  startsAt: string;
  now: string;
  studentJoined: boolean;
  counselorJoined: boolean;
}

export interface AttendanceReconcileInput {
  startsAt: string;
  now: string;
  intervals: readonly AttendanceInterval[];
  disputeRequested?: boolean;
}

export function joinOpensAt(startsAt: string): Date {
  return new Date(Date.parse(startsAt) - JOIN_LEAD_MS);
}

export function joinWindowOpen(startsAt: string, now: string): boolean {
  return Date.parse(now) >= joinOpensAt(startsAt).getTime();
}

export function countdownMs(startsAt: string, now: string): number {
  return Math.max(0, joinOpensAt(startsAt).getTime() - Date.parse(now));
}

export function noShowDueAt(startsAt: string): Date {
  return new Date(Date.parse(startsAt) + NO_SHOW_GRACE_MS);
}

export function isNoShowWindow(startsAt: string, now: string): boolean {
  return Date.parse(now) >= noShowDueAt(startsAt).getTime();
}

export function providerAttended(
  intervals: readonly AttendanceInterval[],
  role: "student" | "counselor",
): boolean {
  return intervals.some(
    (interval) =>
      interval.participantRole === role &&
      interval.evidenceType === "provider_verified",
  );
}

export function tickNoShow(input: AttendanceTickInput): AttendanceOutcome | null {
  if (!isNoShowWindow(input.startsAt, input.now)) {
    return null;
  }
  if (input.studentJoined && input.counselorJoined) {
    return null;
  }
  return "provisional_no_show";
}

export function reconcileAttendance(
  input: AttendanceReconcileInput,
): AttendanceOutcome | null {
  if (input.disputeRequested) {
    return "attendance_disputed";
  }

  const studentEvidence = providerAttended(input.intervals, "student");
  const counselorEvidence = providerAttended(input.intervals, "counselor");

  if (studentEvidence && counselorEvidence) {
    return null;
  }

  if (!isNoShowWindow(input.startsAt, input.now)) {
    return null;
  }

  if (!studentEvidence && !counselorEvidence) {
    return "both_no_show";
  }
  if (!studentEvidence) {
    return "student_no_show";
  }
  return "counselor_no_show";
}

export function counselorAbsenceEscalates(
  outcome: AttendanceOutcome | null,
): boolean {
  return outcome === "counselor_no_show" || outcome === "both_no_show";
}

export function isTerminalNonRewardable(
  outcome: AttendanceOutcome | null,
): boolean {
  return (
    outcome === "student_no_show" ||
    outcome === "counselor_no_show" ||
    outcome === "both_no_show" ||
    outcome === "attendance_disputed"
  );
}
