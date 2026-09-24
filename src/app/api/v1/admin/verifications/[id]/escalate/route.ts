import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { escalateVerificationCaseSql } from "@/server/modules/admin/commands";
import {
  readVersion,
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["reason", "version"] as const;

interface EscalateBody {
  reason?: unknown;
  version?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const requestId = newRequestId();

  try {
    assertBodySize(request);
    assertJsonContentType(request);
    requireIdempotencyKey(request.headers.get("idempotency-key"));
    const body = (await request.json()) as EscalateBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await escalateVerificationCaseSql(context, {
      caseId: requireUuid(id, "id"),
      reason: requiredReason(body.reason),
      version: readVersion(request, body.version),
    });
    return commandSuccess(payload, requestId, { version: payload.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
