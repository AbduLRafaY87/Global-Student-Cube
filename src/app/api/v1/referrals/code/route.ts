import { resolveRequestContext } from "@/server/context";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { issueReferralCodeSql } from "@/server/modules/rewards/commands";

export async function POST(request: Request) {
  const requestId = newRequestId();
  try {
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const context = await resolveRequestContext(requestId);
    return commandSuccess(await issueReferralCodeSql(context), requestId, { status: 201 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
