import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { listVerificationQueueSql } from "@/server/modules/admin/commands";
import {
  parseLimit,
  parseOffset,
  requireAdminContext,
} from "@/server/modules/admin/http";

export async function GET(request: Request) {
  const requestId = newRequestId();

  try {
    const url = new URL(request.url);
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await listVerificationQueueSql(context, {
      kind: url.searchParams.get("kind"),
      state: url.searchParams.get("state"),
      escalated: url.searchParams.get("escalated") === "1",
      limit: parseLimit(url.searchParams.get("limit")),
      offset: parseOffset(url.searchParams.get("offset")),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
