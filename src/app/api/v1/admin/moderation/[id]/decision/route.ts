import { MODERATION_DECISIONS } from "@/domain/news/news";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { decideModerationSql } from "@/server/modules/news/commands";

const ALLOWED_KEYS = ["decision", "response", "notes", "reason"] as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const { id } = await context.params;
    requireUuid(id, "id");
    if (typeof body.reason !== "string" || body.reason.trim().length < 1) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const requestContext = await resolveRequestContext(requestId);
    return commandSuccess(
      await decideModerationSql(
        requestContext,
        id,
        requiredLiteral(body.decision, MODERATION_DECISIONS, "decision"),
        typeof body.response === "string" ? body.response : "",
        typeof body.notes === "string" ? body.notes : "",
        body.reason,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
