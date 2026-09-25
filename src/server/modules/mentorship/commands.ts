import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

type Ctx = RequestContext | GuestContext;

interface JsonPayload {
  payload: Record<string, unknown>;
}

export async function upsertAlumniMentorProfileSql(
  context: RequestContext,
  payload: Record<string, unknown>,
  submit: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.upsert_alumni_mentor_profile($1::jsonb, $2) AS payload`,
    [JSON.stringify(payload), submit],
  );
  return row.payload;
}

export async function upsertParentMentorProfileSql(
  context: RequestContext,
  payload: Record<string, unknown>,
  submit: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.upsert_parent_mentor_profile($1::jsonb, $2) AS payload`,
    [JSON.stringify(payload), submit],
  );
  return row.payload;
}

export async function listPublishedMentorsSql(
  context: Ctx,
  filters: Record<string, unknown>,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_published_mentors($1::jsonb) AS payload`,
    [JSON.stringify(filters)],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function mentorshipLeaderboardSql(
  context: Ctx,
  period: string,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.mentorship_leaderboard($1) AS payload`,
    [period],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function getPublishedMentorSql(
  context: Ctx,
  mentorId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_published_mentor($1::uuid) AS payload`,
    [mentorId],
  );
  return row.payload;
}

export async function myAlumniMentorProfileSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.my_alumni_mentor_profile() AS payload`,
  );
  return row.payload;
}

export async function myParentMentorProfileSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.my_parent_mentor_profile() AS payload`,
  );
  return row.payload;
}

export async function mentorDashboardSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.mentor_dashboard() AS payload`,
  );
  return row.payload;
}

export async function createMentorRequestSql(
  context: RequestContext,
  args: {
    mentorId: string;
    caseId: string | null;
    topics: string[];
    purpose: string;
    consented: boolean;
    preference: string;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.create_mentor_request($1::uuid, $2::uuid, $3::text[], $4, $5, $6) AS payload`,
    [
      args.mentorId,
      args.caseId,
      args.topics,
      args.purpose,
      args.consented,
      args.preference,
    ],
  );
  return row.payload;
}

export async function decideMentorRequestSql(
  context: RequestContext,
  requestId: string,
  decision: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.decide_mentor_request($1::uuid, $2) AS payload`,
    [requestId, decision],
  );
  return row.payload;
}

export async function withdrawMentorRequestSql(
  context: RequestContext,
  requestId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.withdraw_mentor_request($1::uuid) AS payload`,
    [requestId],
  );
  return row.payload;
}

export async function listMentorRequestsSql(
  context: RequestContext,
  tab: string,
): Promise<unknown[]> {
  const row = await queryCommand<{ payload: unknown[] }>(
    context,
    `SELECT commands.list_mentor_requests($1) AS payload`,
    [tab],
  );
  return Array.isArray(row.payload) ? row.payload : [];
}

export async function getMentorRequestSql(
  context: RequestContext,
  requestId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.get_mentor_request($1::uuid) AS payload`,
    [requestId],
  );
  return row.payload;
}

export async function createMentoringBookingSql(
  context: RequestContext,
  requestId: string,
  startsAt: string,
  timezone: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.create_mentoring_booking($1::uuid, $2::timestamptz, $3) AS payload`,
    [requestId, startsAt, timezone],
  );
  return row.payload;
}

export async function submitMentorLogSql(
  context: RequestContext,
  bookingId: string,
  sessionType: string,
  goodPoint: string,
  improvementPoint: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.submit_mentor_log($1::uuid, $2, $3, $4) AS payload`,
    [bookingId, sessionType, goodPoint, improvementPoint],
  );
  return row.payload;
}

export async function submitMentoringFeedbackSql(
  context: RequestContext,
  bookingId: string,
  questionnaire: string,
  answers: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.submit_mentoring_feedback($1::uuid, $2, $3::jsonb) AS payload`,
    [bookingId, questionnaire, JSON.stringify(answers)],
  );
  return row.payload;
}

export async function sessionMentoringSummarySql(
  context: RequestContext,
  bookingId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<JsonPayload>(
    context,
    `SELECT commands.session_mentoring_summary($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function mentorshipCaseProbeSql(
  context: RequestContext,
  caseId: string,
): Promise<boolean> {
  const row = await queryCommand<{ payload: boolean }>(
    context,
    `SELECT commands.mentorship_can_read_case($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function expireMentorRequestsSql(
  context: GuestContext,
): Promise<number> {
  const row = await queryCommand<{ payload: number }>(
    context,
    `SELECT commands.worker_expire_mentor_requests() AS payload`,
  );
  return row.payload;
}
