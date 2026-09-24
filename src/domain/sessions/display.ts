import type { AttendanceOutcome } from "./attendance";
import type { RecordingState } from "./consent";
import type { SessionState } from "./state";

export function sessionStatusLabel(
  state: SessionState,
  linkStatus: string | null,
): string {
  if (state === "cancelled" as SessionState) {
    return "Cancelled";
  }
  if (state === "completed") {
    return "Completed";
  }
  if (state === "ended") {
    return "Ended";
  }
  if (state === "interrupted" || state === "rebooking_required") {
    return "Interrupted";
  }
  if (linkStatus === "preparing") {
    return "Preparing link";
  }
  if (linkStatus === "calendar_attention") {
    return "Calendar sync needs attention";
  }
  if (state === "in_progress") {
    return "In progress";
  }
  if (state === "waiting") {
    return "Waiting";
  }
  return "Confirmed";
}

export function attendanceLabel(outcome: AttendanceOutcome | null): string {
  switch (outcome) {
    case "provisional_no_show":
      return "Provisional no-show";
    case "student_no_show":
      return "Student no-show";
    case "counselor_no_show":
      return "Counselor no-show";
    case "both_no_show":
      return "Both no-show";
    case "attendance_disputed":
      return "Attendance disputed";
    default:
      return "Not provided";
  }
}

export function recordingStatusLabel(state: RecordingState): string {
  switch (state) {
    case "recording":
      return "Recording";
    case "consented":
      return "Consent recorded. Recording stays off until every present participant agrees.";
    case "consent_requested":
      return "Recording paused. Fresh consent is required.";
    case "declined":
      return "Recording declined. The meeting continues with a manual summary.";
    case "stopped":
      return "Recording stopped.";
    default:
      return "Recording is off.";
  }
}

export const PREPARATION_PROMPTS = [
  "Specialization tracks",
  "Curriculum by year",
  "Accreditation",
  "Switching programs",
  "Industry certifications",
  "Thesis, capstone or internship",
  "Prerequisites",
  "Essay review",
  "Translation and notarization",
  "Scholarship eligibility",
  "Work-hour rules",
  "Assistantships",
  "Refunds",
  "Graduate employment data",
] as const;
