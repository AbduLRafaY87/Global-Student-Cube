import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { optionalUuid, parseLimit } from "@/server/modules/admin/http";
import { messageInboxSql } from "@/server/modules/messaging/commands";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const context = await resolveRequestContext(requestId);
    return commandSuccess(
      await messageInboxSql(context, {
        caseId: optionalUuid(url.searchParams.get("caseId")),
        query: url.searchParams.get("q") ?? "",
        unreadOnly: url.searchParams.get("unread") === "1",
        cursor: url.searchParams.get("cursor"),
        limit: parseLimit(url.searchParams.get("limit"), 20),
      }),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
