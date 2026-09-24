import { resolveRequestContext } from "@/server/context";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { assignVerificationCaseSql } from "@/server/modules/admin/commands";
import {
  readVersion,
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["reviewerId", "reason", "version"] as const;

interface AssignBody {
  reviewerId?: unknown;
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
    const body = (await request.json()) as AssignBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await assignVerificationCaseSql(context, {
      caseId: requireUuid(id, "id"),
      reviewerId: requireUuid(
        typeof body.reviewerId === "string" ? body.reviewerId : "",
        "reviewerId",
      ),
      reason: requiredReason(body.reason),
      version: readVersion(request, body.version),
    });
    return commandSuccess(payload, requestId, { version: payload.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
