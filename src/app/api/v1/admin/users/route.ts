import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { searchAdminUsersSql } from "@/server/modules/admin/commands";
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
    const payload = await searchAdminUsersSql(context, {
      query: url.searchParams.get("q") ?? "",
      limit: parseLimit(url.searchParams.get("limit")),
      offset: parseOffset(url.searchParams.get("offset")),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
