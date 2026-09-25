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
import { createMentoringBookingSql } from "@/server/modules/mentorship/commands";

const ALLOWED_KEYS = ["kind", "mentorRequestId", "startsAt", "timezone"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    requiredLiteral(body.kind, ["mentoring"] as const, "kind");
    if (typeof body.mentorRequestId !== "string" || typeof body.startsAt !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await createMentoringBookingSql(
        context,
        requireUuid(body.mentorRequestId, "mentorRequestId"),
        body.startsAt,
        typeof body.timezone === "string" ? body.timezone : "UTC",
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
