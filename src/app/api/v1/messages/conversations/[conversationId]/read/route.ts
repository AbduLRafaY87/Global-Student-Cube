import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { markConversationReadSql } from "@/server/modules/messaging/commands";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { conversationId } = await params;
    requireUuid(conversationId, "conversationId");
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await markConversationReadSql(context, conversationId), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
