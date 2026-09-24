import { resolveRequestContext } from "@/server/context";
import { requireIdempotencyKey } from "@/server/http/headers";
import { newRequestId } from "@/server/http/envelope";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { revokeParentLinkCommand } from "@/server/modules/parent/commands";

interface RouteParams {
  params: Promise<{ linkId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const { linkId } = await params;
    const context = await resolveRequestContext(requestId);
    const result = await revokeParentLinkCommand(context, linkId);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
