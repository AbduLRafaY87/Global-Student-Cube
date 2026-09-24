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
import { commentVerificationCaseSql } from "@/server/modules/admin/commands";
import {
  readVersion,
  requireAdminContext,
  requireUuid,
} from "@/server/modules/admin/http";

const ALLOWED_KEYS = ["comment", "version"] as const;

interface CommentBody {
  comment?: unknown;
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
    const body = (await request.json()) as CommentBody;
    rejectUnknownKeys(body as Record<string, unknown>, ALLOWED_KEYS);

    if (typeof body.comment !== "string" || body.comment.trim() === "") {
      throw new CommandError("VALIDATION_FAILED", "Check the highlighted fields.");
    }

    const { id } = await params;
    const context = await resolveRequestContext(requestId);
    requireAdminContext(context);

    const payload = await commentVerificationCaseSql(context, {
      caseId: requireUuid(id, "id"),
      comment: body.comment.trim(),
      version: readVersion(request, body.version),
    });
    return commandSuccess(payload, requestId, { version: payload.version });
  } catch (error) {
    return commandFailure(error, requestId);
  }
}
