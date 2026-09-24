import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { listAuditEventsSql } from "@/server/modules/admin/commands";
import {
  optionalUuid,
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
    const payload = await listAuditEventsSql(context, {
      actorId: optionalUuid(url.searchParams.get("actor")),
      targetId: optionalUuid(url.searchParams.get("target")),
      action: url.searchParams.get("action"),
      from: url.searchParams.get("from") || null,
      to: url.searchParams.get("to") || null,
      limit: parseLimit(url.searchParams.get("limit")),
      offset: parseOffset(url.searchParams.get("offset")),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
