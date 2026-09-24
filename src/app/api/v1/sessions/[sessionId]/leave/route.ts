import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import {
  recordSessionEventSql,
  sessionWorkspaceSql,
} from "@/server/modules/sessions/commands";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    await recordSessionEventSql(
      context,
      sessionId,
      "left",
      "manual_reviewed",
      `left:${sessionId}:${context.accountId}:${requestId}`,
    );
    const session = await sessionWorkspaceSql(context, sessionId);
    return commandSuccess(session, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
