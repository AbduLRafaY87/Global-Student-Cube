import { NEWS_TOPICS } from "@/domain/news/news";
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
import { optionalUuid } from "@/server/modules/admin/http";
import { upsertCounselorNewsSql } from "@/server/modules/news/commands";

const ALLOWED_KEYS = [
  "id",
  "title",
  "summary",
  "topic",
  "body",
  "sourceUrl",
  "relatedUniversityId",
  "relatedScholarshipId",
  "captions",
  "rightsDeclaration",
  "submit",
] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.title !== "string" || typeof body.summary !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertCounselorNewsSql(context, {
        id: optionalUuid(typeof body.id === "string" ? body.id : null),
        title: body.title,
        summary: body.summary,
        topic: requiredLiteral(body.topic, NEWS_TOPICS, "topic"),
        body: typeof body.body === "string" ? body.body : "",
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : "",
        relatedUniversityId: optionalUuid(
          typeof body.relatedUniversityId === "string" ? body.relatedUniversityId : null,
        ),
        relatedScholarshipId: optionalUuid(
          typeof body.relatedScholarshipId === "string" ? body.relatedScholarshipId : null,
        ),
        captions: typeof body.captions === "string" ? body.captions : "",
        rightsDeclaration: typeof body.rightsDeclaration === "string" ? body.rightsDeclaration : "",
        submit: body.submit === true,
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
