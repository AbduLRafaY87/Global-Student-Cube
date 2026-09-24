import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { revokeParentInvitationCommand } from "@/server/modules/parent/commands";

interface RouteParams {
  params: Promise<{ invitationId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const { invitationId } = await params;
    const context = await resolveRequestContext(requestId);
    const result = await revokeParentInvitationCommand(context, invitationId);
    return commandSuccess(result, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
