import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface AssessmentPayload {
  id: string;
  caseId: string;
  programId: string;
  label: string;
}

export async function saveProgramAssessmentCommand(
  context: RequestContext,
  caseId: string,
  payload: Record<string, unknown>,
): Promise<AssessmentPayload> {
  const row = await queryCommand<{ payload: AssessmentPayload }>(
    context,
    `SELECT commands.save_program_assessment($1, $2::jsonb) AS payload`,
    [caseId, JSON.stringify(payload)],
  );
  return row.payload;
}
