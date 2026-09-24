import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { setReviewFlagCommand } from "@/server/modules/shortlist/commands";

const ALLOWED_KEYS = ["flagged"] as const;

interface RouteParams {
  params: Promise<{ caseId: string; savedId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId, savedId } = await params;
    requireUuid(caseId, "caseId");
    requireUuid(savedId, "savedId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.flagged !== "boolean") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    const result = await setReviewFlagCommand(context, caseId, savedId, body.flagged);
    return commandSuccess(result, requestId);
  } catch (error) {
    if (error instanceof CommandError && error.code === "VALIDATION_FAILED") {
      return commandFailure(
        new CommandError("VALIDATION_FAILED", "Only a saved combination can be flagged."),
        requestId,
      );
    }
    return commandFailure(error, requestId);
  }
}
