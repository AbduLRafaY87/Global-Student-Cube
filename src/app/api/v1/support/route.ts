import { resolveOptionalContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { optionalUuid } from "@/server/modules/admin/http";
import { submitSupportRequestCommand } from "@/server/modules/privacy/commands";

const ALLOWED_KEYS = [
  "category",
  "description",
  "replyChannel",
  "safety",
  "subjectId",
] as const;

const CATEGORIES = ["account", "privacy", "technical", "safety", "other"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (
      typeof body.category !== "string" ||
      !CATEGORIES.includes(body.category as (typeof CATEGORIES)[number])
    ) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    if (typeof body.description !== "string" || body.description.trim() === "") {
      throw new CommandError("VALIDATION_FAILED", "Describe the issue.");
    }
    const context = await resolveOptionalContext(requestId);
    return commandSuccess(
      await submitSupportRequestCommand(context, {
        category: body.category,
        description: body.description,
        replyChannel: typeof body.replyChannel === "string" ? body.replyChannel : null,
        isSafety: body.safety === true || body.category === "safety",
        subjectId: optionalUuid(typeof body.subjectId === "string" ? body.subjectId : null),
      }),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
