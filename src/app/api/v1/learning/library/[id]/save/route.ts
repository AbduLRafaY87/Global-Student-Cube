import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requireUuid } from "@/server/modules/admin/http";
import { saveLearningResourceSql } from "@/server/modules/learning/commands";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    const { id } = await params;
    requireUuid(id, "id");
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await saveLearningResourceSql(context, id), requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
