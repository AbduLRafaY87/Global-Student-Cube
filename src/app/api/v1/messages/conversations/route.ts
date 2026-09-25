import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { openCounselorConversationSql } from "@/server/modules/messaging/commands";

const ALLOWED_KEYS = ["caseId"] as const;

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.caseId !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const caseId = requireUuid(body.caseId, "caseId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await openCounselorConversationSql(context, caseId),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
