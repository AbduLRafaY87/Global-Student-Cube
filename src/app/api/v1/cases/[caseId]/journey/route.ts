import { MILESTONE_KINDS } from "@/domain/journey/milestones";
import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { optionalText, requireUuid } from "@/server/modules/admin/http";
import {
  listJourneyMilestonesCommand,
  upsertJourneyMilestoneCommand,
} from "@/server/modules/journey/commands";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await listJourneyMilestonesCommand(context, caseId), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

const ALLOWED_KEYS = [
  "kind",
  "occurredOn",
  "details",
  "exceptionNote",
  "evidenceId",
] as const;

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertJourneyMilestoneCommand(context, {
        caseId,
        kind: requiredLiteral(body.kind, MILESTONE_KINDS, "kind"),
        occurredOn: optionalText(body.occurredOn),
        details:
          body.details && typeof body.details === "object" && !Array.isArray(body.details)
            ? (body.details as Record<string, unknown>)
            : {},
        exceptionNote: optionalText(body.exceptionNote),
        evidenceId: optionalText(body.evidenceId),
      }),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
