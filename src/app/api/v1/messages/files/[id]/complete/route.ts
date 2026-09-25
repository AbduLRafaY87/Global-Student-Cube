import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { completeConversationFileUploadSql } from "@/server/modules/messaging/commands";

const ALLOWED_KEYS = ["detectedMime"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    requireUuid(id, "id");
    assertBodySize(request);
    assertJsonContentType(request);
    const body = (await request.json()) as Record<string, unknown>;
    rejectUnknownKeys(body, ALLOWED_KEYS);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await completeConversationFileUploadSql(
        context,
        id,
        typeof body.detectedMime === "string" ? body.detectedMime : null,
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
