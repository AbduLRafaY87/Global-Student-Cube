import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export interface SessionParticipantView {
  accountId: string;
  role: string;
  acceptedAt: string | null;
  consent: "yes" | "no" | "pending";
}

export interface SessionWorkspace {
  id: string;
  caseId: string | null;
  hostId: string;
  menteeId: string | null;
  kind: string;
  startsAt: string;
  endsAt: string;
  hostTimezone: string;
  studentTimezone: string | null;
  topics: string[];
  status: string;
  sessionState: string;
  attendanceOutcome: string | null;
  scheduleVersion: number;
  rosterVersion: number;
  linkStatus: string;
  recordingState: string;
  isMinor: boolean;
  guardianConsented: boolean;
  actorRole: string;
  joinOpensAt: string;
  noShowDueAt: string;
  room: {
    provider: string;
    state: string;
    generation: number;
    roomUrl: string | null;
  } | null;
  participants: SessionParticipantView[];
  currentRecording?: {
    id: string;
    providerRecordingId: string | null;
    state: string;
    deleteAfter: string | null;
  } | null;
}

export async function sessionWorkspaceSql(
  context: RequestContext,
  bookingId: string,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.session_workspace($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function transitionSessionSql(
  context: RequestContext,
  bookingId: string,
  event: string,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.transition_session($1::uuid, $2) AS payload`,
    [bookingId, event],
  );
  return row.payload;
}

export async function recordSessionEventSql(
  context: RequestContext,
  bookingId: string,
  kind: string,
  evidence: string,
  externalId: string,
): Promise<void> {
  await queryCommand(
    context,
    `SELECT commands.record_session_event($1::uuid, $2, $3, $4)`,
    [bookingId, kind, evidence, externalId],
  );
}

export async function saveRecordingConsentSql(
  context: RequestContext,
  bookingId: string,
  decision: boolean,
  asGuardian: boolean,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.save_recording_consent($1::uuid, $2, $3) AS payload`,
    [bookingId, decision, asGuardian],
  );
  return row.payload;
}

export async function bumpSessionRosterSql(
  context: RequestContext,
  bookingId: string,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.bump_session_roster($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function saveMeetingRoomSql(
  context: RequestContext,
  args: {
    bookingId: string;
    provider: string;
    externalId: string;
    url: string;
    generation: number;
    state: string;
  },
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.save_meeting_room($1::uuid, $2, $3, $4, $5, $6) AS payload`,
    [
      args.bookingId,
      args.provider,
      args.externalId,
      args.url,
      args.generation,
      args.state,
    ],
  );
  return row.payload;
}

export async function reconcileSessionSql(
  context: RequestContext,
  bookingId: string,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.reconcile_session_attendance($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function startSessionRecordingSql(
  context: RequestContext,
  bookingId: string,
  providerRecordingId: string,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.start_session_recording($1::uuid, $2) AS payload`,
    [bookingId, providerRecordingId],
  );
  return row.payload;
}

export async function stopSessionRecordingSql(
  context: RequestContext,
  bookingId: string,
  enqueueTranscript: boolean,
): Promise<SessionWorkspace> {
  const row = await queryCommand<PayloadRow<SessionWorkspace>>(
    context,
    `SELECT commands.stop_session_recording($1::uuid, $2) AS payload`,
    [bookingId, enqueueTranscript],
  );
  return row.payload;
}

export async function resolveAttendanceDisputeSql(
  context: RequestContext,
  bookingId: string,
  outcome: string,
  reason: string,
): Promise<{ id: string; attendanceOutcome: string }> {
  const row = await queryCommand<
    PayloadRow<{ id: string; attendanceOutcome: string }>
  >(
    context,
    `SELECT commands.resolve_attendance_dispute($1::uuid, $2, $3) AS payload`,
    [bookingId, outcome, reason],
  );
  return row.payload;
}
