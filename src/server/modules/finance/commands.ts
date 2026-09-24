import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface FinancePayload {
  caseId: string;
  completed?: boolean;
}

export async function saveFinancialProfileCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<FinancePayload> {
  const row = await queryCommand<{ payload: FinancePayload }>(
    context,
    `SELECT commands.save_financial_profile($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}

export async function completeModule3Command(
  context: RequestContext,
  caseId: string,
): Promise<FinancePayload> {
  const row = await queryCommand<{ payload: FinancePayload }>(
    context,
    `SELECT commands.complete_module3($1) AS payload`,
    [caseId],
  );
  return row.payload;
}
