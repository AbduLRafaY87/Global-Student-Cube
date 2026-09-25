import { CATALOG_ENTITY_TYPES } from "@/domain/catalog/catalog";
import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { requiredLiteral } from "@/server/http/body";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireAdminContext, requireUuid } from "@/server/modules/admin/http";
import { traceSourceRevisionCommand } from "@/server/modules/catalog/commands";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const entityType = requiredLiteral(
      url.searchParams.get("entityType"),
      CATALOG_ENTITY_TYPES,
      "entityType",
    );
    const entityId = requireUuid(url.searchParams.get("entityId") ?? "", "entityId");
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    return commandSuccess(
      await traceSourceRevisionCommand(context, entityType, entityId),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
