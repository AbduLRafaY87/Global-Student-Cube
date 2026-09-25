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
import { saveLearningProgressSql } from "@/server/modules/learning/commands";

const ALLOWED_KEYS = ["courseId", "lessonId", "position", "complete", "reset"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.courseId !== "string" || typeof body.lessonId !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    requireUuid(body.courseId, "courseId");
    requireUuid(body.lessonId, "lessonId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await saveLearningProgressSql(
        context,
        body.courseId,
        body.lessonId,
        typeof body.position === "number" ? body.position : 0,
        body.complete === true,
        body.reset === true,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
