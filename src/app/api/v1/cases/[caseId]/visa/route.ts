import { CHECKLIST_STATUSES, VISA_DOCUMENTS } from "@/domain/catalog/guidance";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
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
  addVisaRequirementToRoadmapCommand,
  getCaseVisaGuidanceCommand,
  setVisaRequirementProgressCommand,
} from "@/server/modules/catalog/commands";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await getCaseVisaGuidanceCommand(context, caseId), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}

const ALLOWED_KEYS = ["action", "country", "documentKey", "status", "notes", "title"] as const;

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
    if (body.action === "roadmap") {
      if (typeof body.title !== "string") {
        throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
      }
      return commandSuccess(
        await addVisaRequirementToRoadmapCommand(context, caseId, body.title),
        requestId,
        { status: 201 },
      );
    }
    if (typeof body.country !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    return commandSuccess(
      await setVisaRequirementProgressCommand(context, {
        caseId,
        country: body.country,
        documentKey: requiredLiteral(body.documentKey, VISA_DOCUMENTS, "documentKey"),
        status: requiredLiteral(body.status, CHECKLIST_STATUSES, "status"),
        notes: optionalText(body.notes),
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
