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
import { registerConversationFileUploadSql } from "@/server/modules/messaging/commands";

const ALLOWED_KEYS = ["sizeBytes", "mime"] as const;

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { conversationId } = await params;
    requireUuid(conversationId, "conversationId");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    if (typeof body.sizeBytes !== "number" || typeof body.mime !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await registerConversationFileUploadSql(
        context,
        conversationId,
        body.sizeBytes,
        body.mime,
      ),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
