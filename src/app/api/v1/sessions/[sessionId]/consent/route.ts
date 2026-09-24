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
import { saveRecordingConsentSql } from "@/server/modules/sessions/commands";

const ALLOWED_KEYS = ["decision", "asGuardian"] as const;

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.decision !== "boolean") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    const session = await saveRecordingConsentSql(
      context,
      sessionId,
      body.decision,
      body.asGuardian === true,
    );
    return commandSuccess(session, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
