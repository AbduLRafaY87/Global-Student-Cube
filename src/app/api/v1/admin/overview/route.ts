import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { listAdminOverviewSql } from "@/server/modules/admin/commands";
import { requireAdminContext } from "@/server/modules/admin/http";

export async function GET() {
  const requestId = newRequestId();

  try {
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await listAdminOverviewSql(context);
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
