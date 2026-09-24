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
import { saveProgramPairCommand } from "@/server/modules/shortlist/commands";

const ALLOWED_KEYS = ["universityId", "programId"] as const;

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { caseId } = await params;
    requireUuid(caseId, "caseId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const universityId = requireUuid(String(body.universityId ?? ""), "universityId");
    const programId = requireUuid(String(body.programId ?? ""), "programId");
    const context = await resolveRequestContext(requestId);
    const result = await saveProgramPairCommand(context, caseId, universityId, programId);
    return commandSuccess(result, requestId, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof CommandError && error.code === "VALIDATION_FAILED") {
      return commandFailure(
        new CommandError("VALIDATION_FAILED", "Remove a saved program first."),
        requestId,
      );
    }
    return commandFailure(error, requestId);
  }
}
