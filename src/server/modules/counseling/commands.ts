import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export async function counselorHomeSql(
  context: RequestContext,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.counselor_home() AS payload`,
  );
  return row.payload;
}

export async function counselorCaseloadSql(
  context: RequestContext,
  caseId: string | null,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.counselor_caseload($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function counselorAdvisorySql(
  context: RequestContext,
  bookingId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.counselor_advisory($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function studentAdvisorySql(
  context: RequestContext,
  bookingId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.student_advisory($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function saveAdvisoryDraftSql(
  context: RequestContext,
  bookingId: string,
  body: Record<string, unknown>,
  privateNotes: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.save_advisory_draft($1::uuid, $2::jsonb, $3) AS payload`,
    [bookingId, JSON.stringify(body), privateNotes],
  );
  return row.payload;
}

export async function transitionAdvisorySql(
  context: RequestContext,
  bookingId: string,
  event: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.transition_advisory($1::uuid, $2) AS payload`,
    [bookingId, event],
  );
  return row.payload;
}

export async function supersedeAdvisorySql(
  context: RequestContext,
  bookingId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.supersede_advisory($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function submitFeedbackSql(
  context: RequestContext,
  bookingId: string,
  direction: string,
  answers: Record<string, number>,
  comment: string | null,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.submit_feedback($1::uuid, $2, $3::jsonb, $4) AS payload`,
    [bookingId, direction, JSON.stringify(answers), comment],
  );
  return row.payload;
}

export async function requestCounselorChangeSql(
  context: RequestContext,
  caseId: string,
  category: string,
  detail: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.request_counselor_change($1::uuid, $2, $3) AS payload`,
    [caseId, category, detail],
  );
  return row.payload;
}

export async function caseTasksSql(
  context: RequestContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.case_tasks($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function createTaskSql(
  context: RequestContext,
  args: {
    caseId: string;
    title: string;
    ownerRole: string;
    description: string;
    dueAt: string | null;
    bookingId: string | null;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.create_followup_task($1::uuid, $2, $3, $4, $5::timestamptz, $6::uuid) AS payload`,
    [args.caseId, args.title, args.ownerRole, args.description, args.dueAt, args.bookingId],
  );
  return row.payload;
}

export async function transitionTaskSql(
  context: RequestContext,
  taskId: string,
  event: string,
  note: string | null,
  evidenceId: string | null,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.transition_task($1::uuid, $2, $3, $4::uuid) AS payload`,
    [taskId, event, note, evidenceId],
  );
  return row.payload;
}

export async function extendTaskSql(
  context: RequestContext,
  taskId: string,
  nextDue: string,
  reason: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.extend_task($1::uuid, $2::timestamptz, $3) AS payload`,
    [taskId, nextDue, reason],
  );
  return row.payload;
}
