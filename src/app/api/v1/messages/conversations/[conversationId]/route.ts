import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { parseLimit, requireUuid } from "@/server/modules/admin/http";
import { messageThreadSql } from "@/server/modules/messaging/commands";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { conversationId } = await params;
    requireUuid(conversationId, "conversationId");
    const url = new URL(request.url);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await messageThreadSql(
        context,
        conversationId,
        url.searchParams.get("before"),
        parseLimit(url.searchParams.get("limit"), 50),
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
