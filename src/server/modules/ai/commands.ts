import type { GuestContext, RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

type ExecutorContext = RequestContext | GuestContext;

interface PayloadRow<T> {
  payload: T;
}

export async function enqueueAiJobSql(
  context: RequestContext,
  bookingId: string,
  kind: string,
): Promise<{ id: string; kind: string; status: string }> {
  const row = await queryCommand<PayloadRow<{ id: string; kind: string; status: string }>>(
    context,
    `SELECT commands.enqueue_ai_job($1::uuid, $2) AS payload`,
    [bookingId, kind],
  );
  return row.payload;
}

export async function counselorQaSql(
  context: RequestContext,
  bookingId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.counselor_qa($1::uuid) AS payload`,
    [bookingId],
  );
  return row.payload;
}

export async function counselorQaListSql(
  context: RequestContext,
): Promise<unknown[]> {
  const row = await queryCommand<PayloadRow<unknown[]>>(
    context,
    `SELECT commands.counselor_qa_list() AS payload`,
  );
  return row.payload;
}

export async function saveCoachingResponseSql(
  context: RequestContext,
  bookingId: string,
  response: string,
  flag: boolean,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.save_coaching_response($1::uuid, $2, $3) AS payload`,
    [bookingId, response, flag],
  );
  return row.payload;
}

export async function claimAiJobsSql(
  context: ExecutorContext,
  limit: number,
): Promise<
  Array<{
    id: string;
    bookingId: string;
    kind: string;
    sourceRefs: unknown;
  }>
> {
  const row = await queryCommand<
    PayloadRow<
      Array<{
        id: string;
        bookingId: string;
        kind: string;
        sourceRefs: unknown;
      }>
    >
  >(context, `SELECT commands.worker_claim_ai_jobs($1) AS payload`, [limit]);
  return row.payload;
}

export async function completeAiJobSql(
  context: ExecutorContext,
  args: {
    jobId: string;
    status: string;
    model: string;
    inputHash: string;
    flags: unknown[];
    output: Record<string, unknown>;
    costCents: number;
    tokenCount: number;
    error: string | null;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.complete_ai_job($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9) AS payload`,
    [
      args.jobId,
      args.status,
      args.model,
      args.inputHash,
      JSON.stringify(args.flags),
      JSON.stringify(args.output),
      args.costCents,
      args.tokenCount,
      args.error,
    ],
  );
  return row.payload;
}

export async function expireMediaSql(
  context: ExecutorContext,
): Promise<{ recordings: number; transcripts: number }> {
  const row = await queryCommand<PayloadRow<{ recordings: number; transcripts: number }>>(
    context,
    `SELECT commands.worker_expire_media() AS payload`,
  );
  return row.payload;
}

export async function pendingAdvisoryNoticesSql(
  context: ExecutorContext,
): Promise<Array<{ id: string; bookingId: string; caseId: string; eventType: string }>> {
  const row = await queryCommand<
    PayloadRow<Array<{ id: string; bookingId: string; caseId: string; eventType: string }>>
  >(context, `SELECT commands.worker_pending_advisory_notices() AS payload`);
  return row.payload;
}
