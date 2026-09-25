import { LESSON_FORMATS } from "@/domain/learning/learning";
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
import { optionalUuid, requireUuid } from "@/server/modules/admin/http";
import { upsertLessonSql } from "@/server/modules/learning/commands";

const ALLOWED_KEYS = [
  "id",
  "courseId",
  "sort",
  "title",
  "body",
  "format",
  "duration",
  "captions",
  "transcript",
  "mediaUrl",
] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.courseId !== "string" || typeof body.title !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    requireUuid(body.courseId, "courseId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertLessonSql(context, {
        id: optionalUuid(typeof body.id === "string" ? body.id : null),
        courseId: body.courseId,
        sort: typeof body.sort === "number" ? body.sort : 1,
        title: body.title,
        body: typeof body.body === "string" ? body.body : "",
        format: requiredLiteral(body.format, LESSON_FORMATS, "format"),
        duration: typeof body.duration === "number" ? body.duration : null,
        captions: typeof body.captions === "string" ? body.captions : "",
        transcript: typeof body.transcript === "string" ? body.transcript : "",
        mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : "",
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
