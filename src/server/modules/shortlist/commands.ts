import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

export interface SavedPairPayload {
  id: string;
  caseId: string;
  universityId?: string;
  programId?: string;
  slot?: number;
  reviewFlagged?: boolean;
  created?: boolean;
  removed?: boolean;
  flagCleared?: boolean;
}

export async function saveProgramPairCommand(
  context: RequestContext,
  caseId: string,
  universityId: string,
  programId: string,
): Promise<SavedPairPayload> {
  const row = await queryCommand<{ payload: SavedPairPayload }>(
    context,
    `SELECT commands.save_program_pair($1, $2, $3) AS payload`,
    [caseId, universityId, programId],
  );
  return row.payload;
}

export async function removeSavedProgramCommand(
  context: RequestContext,
  caseId: string,
  savedId: string,
): Promise<SavedPairPayload> {
  const row = await queryCommand<{ payload: SavedPairPayload }>(
    context,
    `SELECT commands.remove_saved_program($1, $2) AS payload`,
    [caseId, savedId],
  );
  return row.payload;
}

export async function setReviewFlagCommand(
  context: RequestContext,
  caseId: string,
  savedId: string,
  flagged: boolean,
): Promise<SavedPairPayload> {
  const row = await queryCommand<{ payload: SavedPairPayload }>(
    context,
    `SELECT commands.set_review_flag($1, $2, $3) AS payload`,
    [caseId, savedId, flagged],
  );
  return row.payload;
}
