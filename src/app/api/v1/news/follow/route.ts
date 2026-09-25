import { isNewsTopic } from "@/domain/news/news";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { followTopicSql } from "@/server/modules/news/commands";

const ALLOWED_KEYS = ["topic", "enabled"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.topic !== "string" || !isNewsTopic(body.topic)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await followTopicSql(context, body.topic, body.enabled !== false),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
