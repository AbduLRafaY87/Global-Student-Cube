import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { requestSupportExportSql } from "@/server/modules/admin/commands";
import {
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["accountId", "reason"] as const;

interface Body {
  accountId?: unknown;
  reason?: unknown;
}

export async function POST(request: Request) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await requestSupportExportSql(context, {
      accountId: requireUuid(
        typeof body.accountId === "string" ? body.accountId : "",
        "accountId",
      ),
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId, { status: 202 });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
