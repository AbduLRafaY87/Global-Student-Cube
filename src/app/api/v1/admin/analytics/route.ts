import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireAdminContext } from "@/server/modules/admin/http";
import { adminAnalyticsCommand } from "@/server/modules/privacy/commands";

export async function GET(request: Request) {
  const requestId = newRequestId();
  try {
    const url = new URL(request.url);
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    return commandSuccess(
      await adminAnalyticsCommand(
        context,
        url.searchParams.get("from"),
        url.searchParams.get("to"),
      ),
      requestId,
    );
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
