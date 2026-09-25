import { isEngagementKind } from "@/domain/news/news";
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
import { requireUuid } from "@/server/modules/admin/http";
import { toggleEngagementSql } from "@/server/modules/news/commands";

const ALLOWED_KEYS = ["id", "kind", "enabled"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.id !== "string" || typeof body.kind !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (!isEngagementKind(body.kind)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    requireUuid(body.id, "id");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await toggleEngagementSql(context, body.id, body.kind, body.enabled !== false),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
