import { validateMessageBody } from "@/domain/messaging/messaging";
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
import { sendMessageSql } from "@/server/modules/messaging/commands";

const ALLOWED_KEYS = ["clientMessageId", "body", "fileId"] as const;

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
    if (typeof body.clientMessageId !== "string") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }
    requireUuid(body.clientMessageId, "clientMessageId");
    const text = typeof body.body === "string" ? body.body : "";
    const fileId = typeof body.fileId === "string" ? body.fileId : null;
    if (fileId) {
      requireUuid(fileId, "fileId");
    }
    const check = validateMessageBody(text, fileId);
    if (!check.ok) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.", {
        fields: [{ path: "body", code: check.code }],
      });
    }
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await sendMessageSql(context, {
        conversationId,
        clientMessageId: body.clientMessageId,
        body: text,
        fileId,
      }),
      requestId,
      { status: 201 },
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
