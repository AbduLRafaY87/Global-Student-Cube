import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { sessionWorkspaceSql } from "@/server/modules/sessions/commands";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { sessionId } = await params;
    requireUuid(sessionId, "sessionId");
    const context = await resolveRequestContext(requestId);
    const data = await sessionWorkspaceSql(context, sessionId);
    return commandSuccess(data, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
