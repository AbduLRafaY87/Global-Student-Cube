import { REQUEST_PREFERENCES } from "@/domain/mentorship/requests";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  requiredLiteral,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { createMentorRequestSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = [
  "mentorId",
  "caseId",
  "topics",
  "purpose",
  "consented",
  "preference",
] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.mentorId !== "string" || typeof body.purpose !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const topics = Array.isArray(body.topics)
      ? body.topics.filter((item): item is string => typeof item === "string")
      : [];
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await createMentorRequestSql(context, {
        mentorId: requireUuid(body.mentorId, "mentorId"),
        caseId:
          typeof body.caseId === "string" ? requireUuid(body.caseId, "caseId") : null,
        topics,
        purpose: body.purpose,
        consented: body.consented === true,
        preference: requiredLiteral(body.preference, REQUEST_PREFERENCES, "preference"),
      }),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
