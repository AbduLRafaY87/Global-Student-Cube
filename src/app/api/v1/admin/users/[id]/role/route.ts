import { isAccountRole } from "@/domain/identity/home-role";
import { resolveRequestContext } from "@/server/context";
import { CommandError } from "@/server/errors";
import {
  assertBodySize,
  assertJsonContentType,
  rejectUnknownKeys,
} from "@/server/http/body";
import { newRequestId } from "@/server/http/envelope";
import { requireIdempotencyKey } from "@/server/http/headers";
import { commandFailure, commandSuccess } from "@/server/http/respond";
import { adminSetUserRoleSql } from "@/server/modules/admin/commands";
import {
  readVersion,
  requireAdminContext,
  requiredReason,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["role", "reason", "version"] as const;

interface Body {
  role?: unknown;
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
    const body = (await request.json()) as Body;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.role !== "string" || !isAccountRole(body.role)) {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await adminSetUserRoleSql(context, {
      accountId: requireUuid(id, "id"),
      role: body.role,
      reason: requiredReason(body.reason),
      version: readVersion(request, body.version),
    });
    return commandSuccess(payload, requestId, { version: payload.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
