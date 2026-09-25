import {
  CONTENT_KINDS,
  LEARNING_AUDIENCES,
  LEARNING_CATEGORIES,
  LIBRARY_TYPES,
} from "@/domain/learning/learning";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  optionalLiteral,
  rejectUnknownKeys,
  requiredLiteral,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { optionalUuid } from "@/server/modules/admin/http";
import { upsertContentSql } from "@/server/modules/learning/commands";

const ALLOWED_KEYS = [
  "id",
  "kind",
  "title",
  "topic",
  "category",
  "audience",
  "summary",
  "body",
  "author",
  "instructor",
  "duration",
  "sourceUrls",
  "captions",
  "transcript",
  "mediaUrl",
  "libraryType",
  "eventInformation",
  "namedConsent",
  "consentEvidence",
  "universitySupplied",
  "provenanceVerified",
  "scheduledAt",
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
    const sourceUrls = Array.isArray(body.sourceUrls)
      ? body.sourceUrls.filter((item): item is string => typeof item === "string")
      : [];
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await upsertContentSql(context, {
        id: optionalUuid(typeof body.id === "string" ? body.id : null),
        kind: requiredLiteral(body.kind, CONTENT_KINDS, "kind"),
        title: body.title,
        topic: typeof body.topic === "string" ? body.topic : "",
        category: optionalLiteral(body.category, LEARNING_CATEGORIES, "category"),
        audience: requiredLiteral(body.audience, LEARNING_AUDIENCES, "audience"),
        summary: body.summary,
        body: typeof body.body === "string" ? body.body : "",
        author: typeof body.author === "string" ? body.author : "Global Student Cube",
        instructor: typeof body.instructor === "string" ? body.instructor : null,
        duration: typeof body.duration === "number" ? body.duration : null,
        sourceUrls,
        captions: typeof body.captions === "string" ? body.captions : "",
        transcript: typeof body.transcript === "string" ? body.transcript : "",
        mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : "",
        libraryType: optionalLiteral(body.libraryType, LIBRARY_TYPES, "libraryType"),
        eventInformation: typeof body.eventInformation === "string" ? body.eventInformation : "",
        namedConsent: body.namedConsent === true,
        consentEvidence: typeof body.consentEvidence === "string" ? body.consentEvidence : "",
        universitySupplied: body.universitySupplied === true,
        provenanceVerified: body.provenanceVerified === true,
        scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
