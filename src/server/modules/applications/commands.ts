import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";
import type { ApplicationStatus } from "@/types";

export interface ApplicationResult {
  id: string;
  student_id: string;
  university_id: string;
  status: ApplicationStatus;
  deadline: string;
  version: number;
}

export async function createApplicationCommand(
  context: RequestContext,
  input: {
    universityId: string;
    status: ApplicationStatus;
    deadline: string;
    idempotencyKey: string;
    requestHash: string;
    pathHash: string;
  },
): Promise<ApplicationResult> {
  const row = await queryCommand<{ payload: ApplicationResult }>(
    context,
    `SELECT commands.create_application($1, $2, $3, $4, $5, $6) AS payload`,
    [
      input.universityId,
      input.status,
      input.deadline,
      input.idempotencyKey,
      input.requestHash,
      input.pathHash,
    ],
  );
  return row.payload;
}

export async function updateApplicationCommand(
  context: RequestContext,
  input: {
    id: string;
    expectedVersion: number;
    universityId: string | null;
    status: ApplicationStatus | null;
    deadline: string | null;
  },
): Promise<ApplicationResult> {
  const row = await queryCommand<{ payload: ApplicationResult }>(
    context,
    `SELECT commands.update_application($1, $2, $3, $4, $5) AS payload`,
    [
      input.id,
      input.expectedVersion,
      input.universityId,
      input.status,
      input.deadline,
    ],
  );
  return row.payload;
}

export async function deleteApplicationCommand(
  context: RequestContext,
  input: { id: string; expectedVersion: number },
): Promise<{ id: string; version: number }> {
  const row = await queryCommand<{ payload: { id: string; version: number } }>(
    context,
    `SELECT commands.delete_application($1, $2) AS payload`,
    [input.id, input.expectedVersion],
  );
  return row.payload;
}
