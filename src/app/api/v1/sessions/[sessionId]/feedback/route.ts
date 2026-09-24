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
import { submitFeedbackSql } from "@/server/modules/counseling/commands";

const ALLOWED_KEYS = ["direction", "answers", "comment"] as const;

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
    if (typeof body.direction !== "string" || typeof body.answers !== "object" || body.answers === null) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const answers: Record<string, number> = {};
    for (const [key, value] of Object.entries(body.answers as Record<string, unknown>)) {
      if (typeof value === "number") {
        answers[key] = value;
      }
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await submitFeedbackSql(
        context,
        sessionId,
        body.direction,
        answers,
        typeof body.comment === "string" ? body.comment : null,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
