import type { RequestContext } from "@/server/context";
import { queryCommand } from "@/server/executor";

interface PayloadRow<T> {
  payload: T;
}

export async function getCaseRoadmapCommand(
  context: RequestContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.get_case_roadmap($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function confirmRoadmapTargetCommand(
  context: RequestContext,
  caseId: string,
  programId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.confirm_roadmap_target($1::uuid, $2::uuid) AS payload`,
    [caseId, programId],
  );
  return row.payload;
}

export async function listJourneyMilestonesCommand(
  context: RequestContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.list_journey_milestones($1::uuid) AS payload`,
    [caseId],
  );
  return row.payload;
}

export async function upsertJourneyMilestoneCommand(
  context: RequestContext,
  input: {
    caseId: string;
    kind: string;
    occurredOn: string | null;
    details: Record<string, unknown>;
    exceptionNote: string | null;
    evidenceId: string | null;
  },
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.upsert_journey_milestone($1::uuid, $2, $3::date, $4::jsonb, $5, $6::uuid) AS payload`,
    [
      input.caseId,
      input.kind,
      input.occurredOn,
      JSON.stringify(input.details),
      input.exceptionNote,
      input.evidenceId,
    ],
  );
  return row.payload;
}

export async function attachStoryMilestonesCommand(
  context: RequestContext,
  storyId: string,
  milestoneIds: string[],
): Promise<Record<string, unknown>> {
  const row = await queryCommand<PayloadRow<Record<string, unknown>>>(
    context,
    `SELECT commands.attach_story_milestones($1::uuid, $2::uuid[]) AS payload`,
    [storyId, milestoneIds],
  );
  return row.payload;
}
