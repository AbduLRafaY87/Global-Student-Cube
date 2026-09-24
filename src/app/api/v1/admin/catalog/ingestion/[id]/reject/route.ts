import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import {
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";
import { rejectCatalogIngestionCommand } from "@/server/modules/catalog/commands";

const ALLOWED_KEYS = ["reason"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();
  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as { reason?: unknown };
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);
    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);
    const payload = await rejectCatalogIngestionCommand(context, {
      jobId: requireUuid(id, "id"),
      reason: requiredReason(body.reason),
    });
    return commandSuccess(payload, requestId);
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
