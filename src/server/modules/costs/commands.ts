import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export async function upsertFxSnapshotCommand(
  context: RequestContext,
  input: {
    base: string;
    quote: string;
    rate: number;
    provider: string;
    capturedAt: string;
  },
): Promise<{ id: string }> {
  const row = await queryCommand<{ payload: { id: string } }>(
    context,
    `SELECT commands.upsert_fx_snapshot($1, $2, $3, $4, $5::timestamptz) AS payload`,
    [input.base, input.quote, input.rate, input.provider, input.capturedAt],
  );
  return row.payload;
}

export async function saveBudgetAssumptionsCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<{ caseId: string }> {
  const row = await queryCommand<{ payload: { caseId: string } }>(
    context,
    `SELECT commands.save_budget_assumptions($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function saveCostSnapshotCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<{ id: string; caseId: string }> {
  const row = await queryCommand<{ payload: { id: string; caseId: string } }>(
    context,
    `SELECT commands.save_cost_snapshot($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function shareCostSnapshotCommand(
  context: RequestContext,
  caseId: string,
  parentLinkId: string,
): Promise<{ caseId: string; shared: boolean }> {
  const row = await queryCommand<{ payload: { caseId: string; shared: boolean } }>(
    context,
    `SELECT commands.share_cost_snapshot($1, $2) AS payload`,
    [caseId, parentLinkId],
  );
  return row.payload;
}
